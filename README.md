# DSP Brand Protection Platform

A comprehensive Brand Protection & IP Enforcement Platform designed specifically for DSP (DawnSignPress) to detect, document, and act on copyright infringement and impersonation cases efficiently.

> **Latest Update**: All major UI/UX issues have been resolved, including form layout fixes, case closing functionality, improved URL validation, and enhanced responsive design. The platform is now fully functional and ready for production use.

## 🎯 Purpose

This platform empowers DSP staff to:
- Detect and document IP-related incidents
- Automate monitoring across OER repositories and educational platforms
- Generate legal documents (Cease & Desist, DMCA takedowns)
- Track case progress and outcomes
- Maintain comprehensive records for legal proceedings

## 🚀 Key Features

### 📊 Incident Management
- **Incident Reporting**: Web-based forms with improved layout, URL validation, and responsive design
- **Case Management**: Interactive dashboard with search, filter, assignment, and case closing capabilities
- **Status Tracking**: Real-time visibility into case progress and outcomes with status update functionality

### 📝 Document Automation
- **Template System**: Pre-built templates for legal letters and communications
- **Document Generation**: Automatic population from case data
- **Review Workflow**: Multi-level approval process for legal documents

### 🔍 Automated Monitoring
- **Google Alerts Integration**: Automated detection of DSP content usage
- **BrandMentions API**: Comprehensive brand monitoring
- **Web Scraping**: Scheduled scans of educational platforms and OER repositories

### 📈 Reporting & Analytics
- **Dashboard Analytics**: Charts showing incident trends and resolution outcomes
- **Exportable Reports**: Generate reports for leadership and legal counsel
- **Performance Metrics**: Track response times and case resolution rates

## 🛠 Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **Multer** for file uploads
- **Axios** for API integrations
- **Cheerio** for web scraping
- **Node-cron** for scheduled tasks

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **React Query** for data fetching and caching
- **React Hook Form** for form management with validation
- **Tailwind CSS** for responsive styling and design
- **Recharts** for data visualization
- **Lucide React** for consistent iconography
- **React Hot Toast** for user notifications

## 📁 Project Structure

```
dsp-brand-protection-platform/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── utils/         # Utility functions
│   └── package.json
├── server/                # Node.js backend
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── config/           # Configuration files
│   └── package.json
└── package.json          # Root package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dsp-brand-protection-platform
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   mongod
   ```

5. **Run the application**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5001) and frontend development server (port 3000).

### Quick Start Testing

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Start Backend Server**
   ```bash
   cd server
   npm start
   ```

3. **Start Frontend Development Server**
   ```bash
   cd client
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Default Login: admin@dsp.com / admin123

### Initial Setup

1. **Default Admin User**
   - Email: admin@dsp.com
   - Password: admin123
   - Role: Admin (full system access)

2. **Configure Monitoring**
   - Set up Google Alerts API keys
   - Configure BrandMentions API integration
   - Customize monitoring keywords and domains

3. **Create Templates**
   - Add legal document templates
   - Configure approval workflows
   - Set up email notifications

## 🔧 Configuration

### Recent Improvements & Fixes

**Latest Updates (v1.1.0):**
- ✅ **Fixed Form Layout Issues**: Resolved Create Incident form layout and responsiveness problems
- ✅ **Enhanced URL Validation**: Improved URL input handling with automatic https:// prefix addition
- ✅ **Added Case Closing Functionality**: Implemented case status updates including case closing
- ✅ **Improved Scrolling**: Added proper vertical scrolling to forms and pages
- ✅ **Fixed Icon Imports**: Resolved all Lucide React icon import errors
- ✅ **Enhanced Authentication**: Fixed AuthProvider context and useAuth hook issues
- ✅ **Better Error Handling**: Improved form validation and user feedback
- ✅ **Responsive Design**: Enhanced mobile and tablet compatibility
- ✅ **Code Cleanup**: Removed debug code and improved code quality

**Technical Improvements:**
- Fixed MongoDB connection issues
- Resolved port conflicts (backend now runs on port 5001)
- Added proper form validation and error messages
- Implemented loading states and user feedback
- Enhanced API error handling and responses
- Improved file upload handling
- Added proper TypeScript support for better development experience

### Environment Variables

Key environment variables to configure:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/dsp-brand-protection

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Monitoring APIs
GOOGLE_ALERTS_API_KEY=your-api-key
BRANDMENTIONS_API_KEY=your-api-key
```

### User Roles

The system supports the following user roles:

- **Admin**: Full system access, user management
- **Legal**: Document creation, legal actions, case management
- **Manager**: Case assignment, reporting, oversight
- **Staff**: Incident reporting, case viewing
- **Viewer**: Read-only access

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Incident Management
- `GET /api/incidents` - List incidents with filtering
- `POST /api/incidents` - Create new incident
- `GET /api/incidents/:id` - Get incident details
- `PUT /api/incidents/:id` - Update incident

### Case Management
- `GET /api/cases` - List cases with advanced filtering
- `GET /api/cases/:id` - Get case details
- `PUT /api/cases/:id/assign` - Assign case to user
- `PUT /api/cases/:id/status` - Update case status (including closing cases)

### Document Management
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `POST /api/documents/generate-from-template` - Generate from template
- `PUT /api/documents/:id` - Update document

### Monitoring
- `GET /api/monitoring/alerts` - List monitoring alerts
- `POST /api/monitoring/scan` - Trigger manual scan
- `PUT /api/monitoring/alerts/:id/status` - Update alert status

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Granular permissions system
- **Input Validation**: Comprehensive input sanitization
- **File Upload Security**: Type and size restrictions
- **Rate Limiting**: API request throttling
- **CORS Protection**: Cross-origin request security

## 📈 Monitoring & Analytics

### Dashboard Metrics
- Total cases and incidents
- Open vs. resolved cases
- Response time analytics
- Incident type distribution
- Monthly trends and patterns

### Automated Monitoring
- **Google Alerts**: Keyword-based content detection
- **BrandMentions**: Brand mention tracking
- **Web Scraping**: Automated OER repository scanning
- **Scheduled Scans**: Regular monitoring intervals

## 🚀 Deployment

### Troubleshooting

**Common Issues & Solutions:**

1. **Port Already in Use Error**
   ```bash
   # Kill processes using port 5001
   lsof -ti:5001 | xargs kill -9
   ```

2. **MongoDB Connection Issues**
   ```bash
   # Ensure MongoDB is running
   brew services start mongodb-community
   # or
   sudo systemctl start mongod
   ```

3. **Frontend Build Errors**
   ```bash
   # Clear node_modules and reinstall
   cd client
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Authentication Errors**
   - Ensure AuthProvider is properly wrapped around App component
   - Check JWT_SECRET is set in environment variables
   - Verify MongoDB connection is established before server starts

5. **Form Validation Issues**
   - Check that all required fields have proper validation rules
   - Ensure URL validation is working correctly
   - Verify form submission is handling multipart/form-data properly

### Production Deployment

1. **Environment Setup**
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db
   JWT_SECRET=your-production-secret
   ```

2. **Build Frontend**
   ```bash
   cd client
   npm run build
   ```

3. **Start Production Server**
   ```bash
   cd server
   npm start
   ```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is proprietary software developed for DSP (DawnSignPress). All rights reserved.

## 📋 Changelog

### v1.1.0 (Latest)
- **Major UI/UX Improvements**: Fixed all form layout and responsiveness issues
- **Enhanced Functionality**: Added case closing and status update capabilities
- **Better User Experience**: Improved URL validation, scrolling, and error handling
- **Technical Fixes**: Resolved authentication, icon imports, and database connection issues
- **Code Quality**: Cleaned up debug code and improved overall code structure

### v1.0.0 (Initial Release)
- **Core Features**: Incident reporting, case management, document automation
- **Authentication**: JWT-based authentication with role-based access control
- **Monitoring**: Automated monitoring with Google Alerts and BrandMentions integration
- **Dashboard**: Analytics and reporting capabilities
- **API**: Comprehensive REST API for all platform features

## 🆘 Support

For technical support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## 🔮 Future Enhancements

- **AI Content Matching**: Machine learning-based content detection
- **Advanced Analytics**: Predictive analytics and trend analysis
- **Mobile App**: iOS/Android mobile application
- **API Integrations**: Additional monitoring service integrations
- **Workflow Automation**: Advanced case workflow automation
- **Document OCR**: Optical character recognition for evidence processing

---

**DSP Brand Protection Platform** - Protecting Intellectual Property in the Digital Age