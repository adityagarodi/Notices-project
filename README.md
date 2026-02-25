# Campcast - Online Notice Board

A modern, responsive digital notice board for college announcements and notices.

## Features

- **Student View**: Browse notices in a clean, card-based layout
- **Admin Panel**: Create, edit, and manage notices with authentication
- **Image Upload**: Support for notice attachments with media library
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Dynamic content loading with smooth animations
- **Excel Export**: Download notice history in Excel format

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript, TailwindCSS, Bootstrap Icons
- **Backend**: Python Flask, SQLAlchemy
- **Database**: SQLite
- **Authentication**: Session-based with password hashing

## Project Structure

```
Online Notice Board/
├── index.html          # Main frontend application
├── styles.css          # Custom styles
├── script.js           # Frontend JavaScript logic
├── backend/            # Flask backend application
│   ├── app.py          # Main Flask application
│   ├── requirements.txt # Python dependencies
│   ├── notices.db      # SQLite database (auto-generated)
│   └── uploads/        # Image uploads directory
└── README.md           # This file
```

## Local Setup

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git Bash (for Windows users)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd "Online Notice Board"
   ```

2. **Set up Python virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Initialize the database**
   ```bash
   python app.py
   ```
   The database will be created automatically on first run.

5. **Start the backend server**
   ```bash
   python app.py
   ```
   The backend will run on `http://localhost:5000`

6. **Open the frontend**
   Open `index.html` in your web browser or use a simple HTTP server:
   ```bash
   cd ..
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000`

## Default Admin Account

- **Username**: admin
- **Password**: admin123

*Note: Change the default password after first login for security.*

## Usage

### For Students
- Open the application in Student View to browse all published notices
- Navigate through notices using arrow buttons or swipe on mobile
- Click on notices to view full details and images

### For Administrators
- Switch to Admin Panel and login with your credentials
- Create new notices with title, description, and optional images
- Edit or delete existing notices
- Export notice history to Excel format

## Deployment Options

### Option 1: Vercel (Recommended for Free Hosting)
1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Configure build settings:
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && python app.py`
4. Set environment variables as needed

### Option 2: Render
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `python app.py`
5. Choose the Free tier

### Option 3: PythonAnywhere
1. Create a free account
2. Upload your project files
3. Install requirements in virtual environment
4. Configure the web app to run `app.py`

## Environment Variables

- `SECRET_KEY`: Flask secret key for session management
- `FLASK_ENV`: Set to `production` for production deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues and questions, please create an issue in the GitHub repository.

---

**Note**: This application is designed for educational institutions and can be customized for specific organizational needs.
