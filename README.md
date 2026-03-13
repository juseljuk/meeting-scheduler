# Meeting Scheduler Application

A containerized web application for scheduling and managing customer meetings with travel information for small teams. Built with Node.js/Express backend, SQLite database, and vanilla JavaScript frontend with FullCalendar integration.

## Features

- 📅 **Calendar View**: Interactive monthly/weekly/daily calendar views
- ✏️ **Meeting Management**: Create, edit, and delete meetings
- 👥 **Customer Tracking**: Associate meetings with customers
- 🏢 **On-site/Remote**: Mark meetings as on-site or remote
- 🌍 **Country Information**: Optional country field for international meetings
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🐳 **Containerized**: Fully dockerized for easy deployment
- ☁️ **Cloud Ready**: Deployable to IBM Cloud Code Engine

## Technology Stack

### Backend
- Node.js 18+
- Express.js
- SQLite3 with better-sqlite3
- CORS middleware

### Frontend
- HTML5
- Vanilla JavaScript (ES6+)
- CSS3
- FullCalendar.js

### DevOps
- Docker & Docker Compose
- Nginx (frontend server)
- IBM Cloud Code Engine

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development without Docker)
- IBM Cloud CLI (for cloud deployment)
- IBM Cloud account with Code Engine access

## Quick Start

### Local Development with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd meeting-app
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000
   - Health check: http://localhost:3000/health

4. **Stop the application**
   ```bash
   docker-compose down
   ```

### Local Development without Docker

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

The backend will run on http://localhost:3000

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Serve with a simple HTTP server**
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Or using Node.js http-server
   npx http-server -p 8080
   ```

The frontend will be available at http://localhost:8080

**Note**: Update the API_BASE_URL in `frontend/js/app.js` if needed.

## Database Schema

### meetings table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| title | TEXT | Meeting title (required) |
| description | TEXT | Meeting description |
| start_datetime | TEXT | Start date and time (required) |
| end_datetime | TEXT | End date and time (required) |
| location | TEXT | Meeting location |
| attendees | TEXT | Comma-separated attendee emails |
| customer | TEXT | Customer name/organization |
| is_onsite | INTEGER | 0 = remote, 1 = on-site |
| country | TEXT | Country for on-site meetings |
| created_at | TEXT | Creation timestamp |
| updated_at | TEXT | Last update timestamp |

## API Endpoints

### Meetings

- `GET /api/meetings` - Get all meetings
- `GET /api/meetings/:id` - Get specific meeting
- `POST /api/meetings` - Create new meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### Health Check

- `GET /health` - Application health status

### Example API Request

**Create Meeting:**
```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Customer Meeting",
    "customer": "Acme Corp",
    "description": "Quarterly review",
    "start_datetime": "2024-03-20T10:00:00",
    "end_datetime": "2024-03-20T11:00:00",
    "location": "Helsinki Office",
    "attendees": "john@example.com, jane@example.com",
    "is_onsite": 1,
    "country": "Finland"
  }'
```

## Deployment to IBM Cloud Code Engine

### Prerequisites

1. **Install IBM Cloud CLI**
   ```bash
   curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
   ```

2. **Login to IBM Cloud**
   ```bash
   ibmcloud login --sso  # or ibmcloud login
   ```

3. **Install required plugins**
   ```bash
   ibmcloud plugin install code-engine
   ibmcloud plugin install container-registry
   ```

4. **Create Container Registry namespace** (if not exists)
   ```bash
   ibmcloud cr namespace-add <your-namespace>
   ```

### Deployment Steps

1. **Update deployment script**
   
   Edit `ibm-cloud/deploy.sh` and update:
   - `PROJECT_NAME` - Your Code Engine project name (default: ce-wxo-related)
   - `REGISTRY_NAMESPACE` - Your IBM Cloud Container Registry namespace
   - `REGION` - Your preferred region (e.g., us-south, eu-de)

2. **Run deployment script**
   ```bash
   cd ibm-cloud
   chmod +x deploy.sh
   ./deploy.sh
   ```

   The script will:
   - Authenticate with IBM Cloud Container Registry
   - Build and push Docker images
   - Create/select Code Engine project
   - Create registry secret for image pulling
   - Deploy backend application
   - Deploy frontend application with backend URL
   - Display application URLs

3. **Access your application**
   
   The script will output:
   ```
   ✅ Backend deployed at: https://meeting-app-backend.xxx.codeengine.appdomain.cloud
   ✅ Frontend deployed at: https://meeting-app-frontend.xxx.codeengine.appdomain.cloud
   ```

### Architecture in IBM Cloud

The deployed application uses:
- **Direct API Communication**: Frontend calls backend directly via CORS (no reverse proxy)
- **Environment Variable Injection**: Backend URL is injected into frontend HTML at container startup
- **Auto-scaling**: Both applications scale 1-3 instances based on load
- **Container Registry**: Private images stored in IBM Cloud Container Registry
- **Registry Secrets**: Secure image pulling from private registry

### Manual Deployment

If you prefer manual deployment:

```bash
# Login to Container Registry
ibmcloud cr login

# Build and push backend
cd backend
docker build -t de.icr.io/<namespace>/meeting-app-backend:v1 .
docker push de.icr.io/<namespace>/meeting-app-backend:v1

# Build and push frontend
cd ../frontend
docker build -t de.icr.io/<namespace>/meeting-app-frontend:v1 .
docker push de.icr.io/<namespace>/meeting-app-frontend:v1

# Create Code Engine project
ibmcloud ce project create --name meeting-app
ibmcloud ce project select --name meeting-app

# Create registry secret
ibmcloud ce registry create --name icr-secret \
  --server de.icr.io \
  --username iamapikey \
  --password <your-api-key>

# Deploy backend
ibmcloud ce application create \
  --name meeting-app-backend \
  --image de.icr.io/<namespace>/meeting-app-backend:v1 \
  --registry-secret icr-secret \
  --port 3000 \
  --min-scale 1 \
  --max-scale 3 \
  --cpu 0.5 \
  --memory 1G \
  --env NODE_ENV=production

# Get backend URL
BACKEND_URL=$(ibmcloud ce application get --name meeting-app-backend --output json | jq -r '.status.url')

# Deploy frontend with backend URL
ibmcloud ce application create \
  --name meeting-app-frontend \
  --image de.icr.io/<namespace>/meeting-app-frontend:v1 \
  --registry-secret icr-secret \
  --port 80 \
  --min-scale 1 \
  --max-scale 3 \
  --cpu 0.25 \
  --memory 0.5G \
  --env BACKEND_URL="${BACKEND_URL}"
```

### Updating Deployed Application

To update after making changes:

```bash
# Rebuild images
cd backend
docker build -t de.icr.io/<namespace>/meeting-app-backend:v1 .
docker push de.icr.io/<namespace>/meeting-app-backend:v1

cd ../frontend
docker build -t de.icr.io/<namespace>/meeting-app-frontend:v1 .
docker push de.icr.io/<namespace>/meeting-app-frontend:v1

# Redeploy (or just run deploy.sh again)
cd ../ibm-cloud
./deploy.sh
```

## Project Structure

```
meeting-app/
├── backend/
│   ├── src/
│   │   ├── server.js           # Express server
│   │   ├── database.js         # SQLite database setup
│   │   ├── routes/
│   │   │   └── meetings.js     # Meeting API routes
│   │   └── middleware/
│   │       └── errorHandler.js # Error handling
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── index.html              # Main HTML page
│   ├── css/
│   │   └── styles.css          # Application styles
│   ├── js/
│   │   ├── app.js              # Main app logic
│   │   ├── meetings.js         # Meeting CRUD operations
│   │   └── calendar.js         # Calendar functionality
│   ├── nginx.conf              # Nginx configuration
│   └── Dockerfile
├── ibm-cloud/
│   └── deploy.sh               # Deployment script
├── data/                       # SQLite database (gitignored)
├── docker-compose.yml          # Local development setup
├── .gitignore
├── .dockerignore
├── PLAN.md                     # Implementation plan
└── README.md                   # This file
```

## Environment Variables

### Backend

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_PATH` - Path to SQLite database file
- `CORS_ORIGIN` - Allowed CORS origin (optional)

### Frontend

The frontend automatically detects if running on localhost and adjusts the API URL accordingly.

## Development

### Adding New Features

1. **Backend**: Add routes in `backend/src/routes/`
2. **Frontend**: Add JavaScript modules in `frontend/js/`
3. **Database**: Update schema in `backend/src/database.js`

### Testing

```bash
# Test backend health
curl http://localhost:3000/health

# Test API endpoints
curl http://localhost:3000/api/meetings
```

## Troubleshooting

### Database Issues

If you encounter database errors:
```bash
# Remove the database and restart
rm -rf data/meetings.db
docker-compose down
docker-compose up --build
```

### Port Conflicts

If ports 3000 or 8080 are already in use:
```bash
# Edit docker-compose.yml and change the port mappings
# For example: "8081:80" instead of "8080:80"
```

### CORS Issues

If you encounter CORS errors when the frontend and backend are on different domains:
1. Update the CORS configuration in `backend/src/server.js`
2. Or use the nginx proxy configuration in production

## Security Considerations

- **No Authentication**: Current version has no authentication (suitable for internal team use)
- **Input Validation**: Basic validation is implemented
- **SQL Injection**: Protected by parameterized queries
- **XSS Protection**: HTML escaping implemented in frontend

### Future Security Enhancements

- Add user authentication (JWT tokens)
- Implement role-based access control
- Add HTTPS/TLS encryption
- Rate limiting on API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section
- Review the PLAN.md for implementation details
- Open an issue on the repository

## Roadmap

### Phase 2 Features (Future)
- [ ] User authentication and authorization
- [ ] Email notifications for meeting reminders
- [ ] Export meetings to iCalendar format
- [ ] Search and filter functionality
- [ ] Team member availability view
- [ ] Conflict detection for overlapping meetings
- [ ] Mobile app (React Native)
- [ ] Integration with calendar services (Google Calendar, Outlook)

---

Built with ❤️ for efficient team meeting management