/**
 * Notification Service
 * Handles email, SMS, and push notifications
 */

import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { query } from '../database/connection';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

interface NotificationOptions {
  type: 'email' | 'sms' | 'push' | 'all';
  recipient: string | string[];
  subject?: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  template?: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms';
  subject?: string;
  body: string;
  variables: string[];
}

export class NotificationService extends EventEmitter {
  private static instance: NotificationService;
  private twilioClient: any;
  private sendgridConfigured: boolean = false;
  private templates: Map<string, NotificationTemplate> = new Map();
  private notificationQueue: NotificationOptions[] = [];
  private processing: boolean = false;

  private constructor() {
    super();
    this.initialize();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async initialize() {
    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendgridConfigured = true;
      logger.info('SendGrid email service initialized');
    }

    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      logger.info('Twilio SMS service initialized');
    }

    // Load notification templates
    await this.loadTemplates();

    // Start notification processor
    this.startProcessor();
  }

  /**
   * Load notification templates from database or config
   */
  private async loadTemplates() {
    // Default templates
    this.templates.set('docket_retrieved', {
      id: 'docket_retrieved',
      name: 'Docket Retrieved',
      type: 'email',
      subject: 'Docket {{docket_code}} Retrieved',
      body: `
        <h2>Docket Retrieved</h2>
        <p>The following docket has been retrieved:</p>
        <ul>
          <li><strong>Docket Code:</strong> {{docket_code}}</li>
          <li><strong>Title:</strong> {{title}}</li>
          <li><strong>Retrieved By:</strong> {{retrieved_by}}</li>
          <li><strong>Time:</strong> {{timestamp}}</li>
          <li><strong>Location:</strong> {{location}}</li>
        </ul>
        <p>Please ensure proper handling and timely return.</p>
      `,
      variables: ['docket_code', 'title', 'retrieved_by', 'timestamp', 'location']
    });

    this.templates.set('rfid_alert', {
      id: 'rfid_alert',
      name: 'RFID Security Alert',
      type: 'email',
      subject: '🚨 Security Alert: {{alert_type}}',
      body: `
        <h2>RFID Security Alert</h2>
        <p><strong>Alert Type:</strong> {{alert_type}}</p>
        <p><strong>Severity:</strong> {{severity}}</p>
        <p><strong>Tag ID:</strong> {{tag_id}}</p>
        <p><strong>Location:</strong> {{location}}</p>
        <p><strong>Message:</strong> {{message}}</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <p>Please investigate immediately.</p>
      `,
      variables: ['alert_type', 'severity', 'tag_id', 'location', 'message', 'timestamp']
    });

    this.templates.set('task_assigned', {
      id: 'task_assigned',
      name: 'Task Assigned',
      type: 'sms',
      subject: '',
      body: 'New task assigned: {{task_title}}. Priority: {{priority}}. Due: {{due_time}}. Open mobile app for details.',
      variables: ['task_title', 'priority', 'due_time']
    });

    this.templates.set('audit_report', {
      id: 'audit_report',
      name: 'Audit Report Ready',
      type: 'email',
      subject: 'Audit Report Generated - {{report_date}}',
      body: `
        <h2>Audit Report Available</h2>
        <p>Your requested audit report has been generated.</p>
        <ul>
          <li><strong>Report Period:</strong> {{start_date}} to {{end_date}}</li>
          <li><strong>Total Events:</strong> {{total_events}}</li>
          <li><strong>Compliance Level:</strong> {{compliance_level}}</li>
        </ul>
        <p><a href="{{download_link}}">Download Report</a></p>
      `,
      variables: ['report_date', 'start_date', 'end_date', 'total_events', 'compliance_level', 'download_link']
    });

    logger.info(`Loaded ${this.templates.size} notification templates`);
  }

  /**
   * Send notification
   */
  async send(options: NotificationOptions): Promise<void> {
    // Add to queue
    this.notificationQueue.push(options);
    
    // Emit event
    this.emit('notification_queued', options);
    
    // Process immediately if high priority
    if (options.priority === 'urgent' || options.priority === 'high') {
      await this.processQueue();
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(to: string | string[], subject: string, body: string, data?: any): Promise<void> {
    if (!this.sendgridConfigured) {
      logger.warn('SendGrid not configured, skipping email');
      return;
    }

    try {
      const msg = {
        to: Array.isArray(to) ? to : [to],
        from: process.env.EMAIL_FROM || 'noreply@dockettrack.gov',
        subject,
        html: body,
        text: this.stripHtml(body)
      };

      await sgMail.send(msg);
      logger.info(`Email sent to ${Array.isArray(to) ? to.join(', ') : to}`);
      
      // Log in audit
      await this.logNotification('email', to, subject, 'sent');
      
    } catch (error) {
      logger.error('Failed to send email:', error);
      await this.logNotification('email', to, subject, 'failed', error);
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(to: string, message: string): Promise<void> {
    if (!this.twilioClient) {
      logger.warn('Twilio not configured, skipping SMS');
      return;
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      logger.info(`SMS sent to ${to}: ${result.sid}`);
      await this.logNotification('sms', to, message, 'sent');
      
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      await this.logNotification('sms', to, message, 'failed', error);
      throw error;
    }
  }

  /**
   * Send push notification (WebSocket)
   */
  private async sendPush(userId: string, message: string, data?: any): Promise<void> {
    // This would integrate with Socket.IO or push notification service
    this.emit('push_notification', {
      userId,
      message,
      data,
      timestamp: new Date()
    });
    
    logger.info(`Push notification sent to user ${userId}`);
    await this.logNotification('push', userId, message, 'sent');
  }

  /**
   * Process notification with template
   */
  async sendWithTemplate(templateId: string, recipient: string | string[], variables: Record<string, any>): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Replace variables in template
    let subject = template.subject || '';
    let body = template.body;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    // Send based on template type
    if (template.type === 'email') {
      await this.sendEmail(recipient, subject, body, variables);
    } else if (template.type === 'sms') {
      await this.sendSMS(recipient as string, body);
    }
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.notificationQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (!notification) continue;

      try {
        switch (notification.type) {
          case 'email':
            await this.sendEmail(
              notification.recipient,
              notification.subject || 'Notification',
              notification.message,
              notification.data
            );
            break;
            
          case 'sms':
            await this.sendSMS(
              notification.recipient as string,
              notification.message
            );
            break;
            
          case 'push':
            await this.sendPush(
              notification.recipient as string,
              notification.message,
              notification.data
            );
            break;
            
          case 'all':
            // Send to all channels
            await Promise.all([
              this.sendEmail(notification.recipient, notification.subject || 'Notification', notification.message, notification.data),
              this.sendSMS(notification.recipient as string, notification.message),
              this.sendPush(notification.recipient as string, notification.message, notification.data)
            ]);
            break;
        }
      } catch (error) {
        logger.error('Failed to process notification:', error);
      }
    }

    this.processing = false;
  }

  /**
   * Start notification processor
   */
  private startProcessor(): void {
    // Process queue every 5 seconds
    setInterval(() => {
      this.processQueue();
    }, 5000);
  }

  /**
   * Log notification in audit trail
   */
  private async logNotification(
    type: string,
    recipient: string | string[],
    content: string,
    status: string,
    error?: any
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO audit_logs (
          action_type, resource_type, description, category, severity, status
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'NOTIFICATION',
        type,
        `${type} notification to ${Array.isArray(recipient) ? recipient.join(', ') : recipient}`,
        'SYSTEM_EVENT',
        status === 'failed' ? 'ERROR' : 'INFO',
        status.toUpperCase()
      ]);
    } catch (err) {
      logger.error('Failed to log notification:', err);
    }
  }

  /**
   * Strip HTML tags from string
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: number): Promise<any[]> {
    const result = await query(`
      SELECT * FROM notification_preferences
      WHERE user_id = $1 AND enabled = TRUE
    `, [userId]);
    
    return result.rows;
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: number,
    channel: string,
    settings: any
  ): Promise<void> {
    await query(`
      INSERT INTO notification_preferences (user_id, channel, settings)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, channel)
      DO UPDATE SET settings = $3, updated_at = CURRENT_TIMESTAMP
    `, [userId, channel, JSON.stringify(settings)]);
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(recipients: string[], options: Omit<NotificationOptions, 'recipient'>): Promise<void> {
    const promises = recipients.map(recipient =>
      this.send({ ...options, recipient })
    );
    
    await Promise.all(promises);
  }

  /**
   * Send alert notification
   */
  async sendAlert(alert: {
    type: string;
    severity: string;
    message: string;
    data?: any;
  }): Promise<void> {
    // Get users subscribed to this alert type
    const result = await query(`
      SELECT u.email, u.id, np.channel
      FROM users u
      JOIN notification_preferences np ON u.id = np.user_id
      WHERE np.alert_type = $1 AND np.severity <= $2 AND np.enabled = TRUE
    `, [alert.type, alert.severity]);

    for (const user of result.rows) {
      await this.send({
        type: user.channel as any,
        recipient: user.channel === 'email' ? user.email : user.id,
        subject: `Alert: ${alert.type}`,
        message: alert.message,
        data: alert.data,
        priority: alert.severity === 'critical' ? 'urgent' : 'normal'
      });
    }
  }
}

export default NotificationService;