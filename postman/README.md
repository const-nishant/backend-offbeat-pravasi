# Offbeat Pravasi API - Postman Collection

Production-grade Postman collection for the Offbeat Pravasi Backend API with automated token management, comprehensive test scripts, and environment configurations.

## 📦 Files

- **Offbeat-Pravasi-API.postman_collection.json** - Main Postman collection with all API endpoints
- **Offbeat-Pravasi-API.postman_environment.json** - Development environment variables
- **Offbeat-Pravasi-API-Production.postman_environment.json** - Production environment variables

## 🚀 Quick Start

### 1. Import Collection and Environment

1. Open Postman
2. Click **Import** button
3. Select both the collection file and environment file(s)
4. Or drag and drop the files into Postman

### 2. Configure Environment Variables

#### Development Environment

- `baseUrl`: `http://localhost:3000` (default)
- `apiKey`: Your API key (if configured, leave empty if not required)
- `testEmail`: Test email for authentication
- `testPassword`: Test password for authentication

#### Production Environment

- `baseUrl`: Your production API URL
- `apiKey`: Production API key
- `testEmail`: Production email
- `testPassword`: Production password

### 3. Select Environment

Select the appropriate environment from the environment dropdown in Postman (top right).

## ✨ Features

### 🔐 Automated Token Management

- **Auto-login**: Tokens are automatically stored after successful login
- **Auto-refresh**: Access tokens are automatically refreshed when they expire (within 5 minutes)
- **Auto-logout**: Tokens are cleared when logout is called
- **Token extraction**: User ID is automatically extracted from JWT tokens

### 🧪 Comprehensive Test Scripts

Every request includes test scripts that validate:

- HTTP status codes
- Response structure
- Response time (< 5 seconds)
- JSON validity
- Required fields presence

### 📋 Organized Endpoints

Endpoints are organized into logical folders:

- **Health**: Health check endpoints
- **Authentication**: All auth-related endpoints

### 🔄 Pre-request Scripts

Collection-level pre-request script automatically:

- Checks token expiration
- Refreshes tokens if needed (within 5 minutes of expiry)
- Handles token refresh silently

## 📚 API Endpoints

### Health

- `GET /health` - Base health check
- `GET /health/redis` - Redis connection health check

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/email/send-otp` - Send OTP to email
- `POST /auth/email/verify-otp` - Verify OTP code
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - Logout current session

## 🔧 Usage Examples

### 1. Basic Flow

1. **Health Check**: Run `GET /health` to verify API is running
2. **Register/Login**: Run `POST /auth/register` or `POST /auth/login`
   - Tokens are automatically stored in environment variables
3. **Authenticated Requests**: All subsequent requests use the stored token automatically
4. **Logout**: Run `POST /auth/logout` to clear tokens

### 2. OTP Flow

1. **Send OTP**: Run `POST /auth/email/send-otp`
2. **Check Email**: Retrieve OTP from email
3. **Set OTP**: Update `otp` environment variable with the received code
4. **Verify OTP**: Run `POST /auth/email/verify-otp`
   - Tokens are automatically stored if verification succeeds

### 3. Token Refresh

- Tokens are automatically refreshed before expiry (within 5 minutes)
- Manual refresh: Run `POST /auth/refresh`
- Tokens are automatically updated in environment variables

## 🛠️ Advanced Features

### Debug Mode

Set `debug` environment variable to `true` to enable console logging of responses.

### Custom Scripts

You can add custom scripts to individual requests or folders. The collection includes:

- Global pre-request script for token management
- Global test script for common validations
- Request-specific test scripts for endpoint-specific validations

### Environment Variables

All sensitive values (tokens, passwords, API keys) are stored as `secret` type in Postman, which means they won't be visible in the UI.

## 📝 Notes

- **API Key**: If your API doesn't require an API key, leave the `apiKey` variable empty
- **Token Expiry**: The auto-refresh mechanism checks tokens 5 minutes before expiry
- **Error Handling**: All requests include error handling in test scripts
- **Response Time**: All requests validate response time is under 5 seconds

## 🔒 Security Best Practices

1. **Never commit** environment files with real credentials to version control
2. **Use secrets** for sensitive values (tokens, passwords, API keys)
3. **Rotate credentials** regularly in production
4. **Use different environments** for development, staging, and production
5. **Review test scripts** before using in production

## 🐛 Troubleshooting

### Tokens not refreshing automatically

- Check that `refreshToken` is set in environment
- Verify token format is correct
- Check console for errors (enable debug mode)

### 401 Unauthorized errors

- Verify `accessToken` is set in environment
- Check if token has expired (manual refresh may be needed)
- Verify API key is correct (if required)

### Tests failing

- Check response structure matches expected format
- Verify API is running and accessible
- Enable debug mode to see response details

## 📞 Support

For issues or questions about the API, please refer to the main project documentation or contact the development team.

---

**Last Updated**: 2024
**Collection Version**: 1.0.0
