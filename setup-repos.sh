#!/bin/bash

# Setup script for splitting into public and private repos
# Run this from your project directory

echo "🚀 Setting up GitHub repositories..."
echo "=================================="

# Step 1: Clean up public repo
echo "📦 Step 1: Cleaning up public repository..."
cd "/Users/user/Docket Tracking"

# Update gitignore first
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Environment
.env
.env.local

# Private/Sensitive files
private-docs/
*COST*.md
*cost*.md
CLIENT_*.md
REVISED_*.md
ENTERPRISE_*.md
enterprise_*.md

# OS Files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Logs
*.log
EOF

# Remove sensitive files from git tracking if they exist
git rm -r --cached private-docs/ 2>/dev/null || true
git rm --cached *COST*.md 2>/dev/null || true
git rm --cached CLIENT_*.md 2>/dev/null || true
git rm --cached ENTERPRISE_*.md 2>/dev/null || true
git rm --cached REVISED_*.md 2>/dev/null || true

# Stage the changes
git add .gitignore
git add -A

# Commit if there are changes
if ! git diff --cached --quiet; then
    git commit -m "Remove sensitive documents and update gitignore for public repository"
    echo "✅ Committed changes to public repo"
else
    echo "✅ Public repo already clean"
fi

# Push to public repo
echo "📤 Pushing to public repository..."
git push origin main || git push origin master

echo "✅ Public repository cleaned!"
echo ""

# Step 2: Setup private repo
echo "📦 Step 2: Setting up private repository..."
echo "Please make sure you've created a PRIVATE repo called 'rfid-evidence-system' on GitHub"
echo "Press Enter when ready..."
read

cd "/Users/user/Docket Tracking/private-docs"

# Check if git already initialized
if [ ! -d .git ]; then
    git init
    echo "✅ Initialized git in private-docs"
fi

# Check if remote already exists
if ! git remote | grep -q origin; then
    git remote add origin https://github.com/GABRIELS562/rfid-evidence-system.git
    echo "✅ Added remote origin"
else
    echo "✅ Remote already configured"
fi

# Add all files
git add .

# Commit if there are changes
if ! git diff --cached --quiet; then
    git commit -m "Add confidential cost analysis and financial documents"
    echo "✅ Committed private documents"
else
    echo "✅ No new changes to commit"
fi

# Push to private repo
echo "📤 Pushing to private repository..."
git branch -M main
git push -u origin main

echo ""
echo "🎉 SUCCESS! Repository setup complete!"
echo "=================================="
echo "✅ Public repo: https://github.com/GABRIELS562/Docket-Tracking-"
echo "🔒 Private repo: https://github.com/GABRIELS562/rfid-evidence-system"
echo ""
echo "Next steps:"
echo "1. Verify public repo has no cost documents"
echo "2. Verify private repo is set to PRIVATE"
echo "3. Add collaborators to private repo as needed"