# 🚀 Deployment Guide for Online Notice Board

## 📋 Prerequisites
- GitHub account
- Project pushed to GitHub repository

## 🌐 Free Hosting Options

### Option 1: Vercel (Recommended - Easiest)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "New Project"
4. Import your `online-notice-board` repository
5. **Framework Preset**: Python
6. **Root Directory**: . (leave empty)
7. **Build Command**: `pip install -r backend/requirements.txt`
8. **Start Command**: `python backend/app.py`
9. Click "Deploy"

**Environment Variables for Vercel:**
- `SECRET_KEY`: your-secret-key-here
- `PYTHON_VERSION`: `3.9`

### Option 2: Render (Great Alternative)
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. **Name**: online-notice-board
6. **Runtime**: Python
7. **Build Command**: `pip install -r backend/requirements.txt`
8. **Start Command**: `python backend/app.py`
9. **Instance Type**: Free
10. Click "Create Web Service"

### Option 3: Netlify + External Backend
1. **Frontend on Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop your project folder
   - Only serves static files (HTML/CSS/JS)

2. **Backend on PythonAnywhere:**
   - Go to [pythonanywhere.com](https://pythonanywhere.com)
   - Create free account
   - Upload backend files
   - Install requirements and run

## 🔧 Configuration Steps

### After Deployment:
1. **Update Frontend API URL:**
   - Edit `script.js`
   - Find: `const API_BASE = 'http://localhost:5000/api';`
   - Change to: `const API_BASE = 'https://your-app-url.vercel.app/api';`

2. **Set Environment Variables:**
   - Add `SECRET_KEY` with a secure random string
   - Set `FLASK_ENV=production`

## 📱 Testing Your Deployed App
1. Visit your deployed URL
2. Test Student View (should load notices)
3. Test Admin Login:
   - Default: admin / admin123
   - Create a new notice
   - Upload an image
   - Verify everything works

## 🔄 Updating Your App
1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update description"
   git push origin main
   ```
3. Most platforms auto-redeploy on push

## 🛠️ Troubleshooting

### Common Issues:
- **CORS Errors**: Update CORS origins in `backend/app.py`
- **Database Issues**: May need to recreate database on production
- **Image Uploads**: Check upload directory permissions
- **Environment Variables**: Ensure all required vars are set

### Getting Help:
- Check platform logs
- Review deployment settings
- Test API endpoints directly

## 📊 Monitoring
- Most platforms provide logs and monitoring
- Check for errors regularly
- Monitor uptime and performance

---

**🎉 Congratulations!** Your Online Notice Board is now live and accessible to everyone!
