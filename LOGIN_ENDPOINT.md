# Email/Password Login Endpoint

This endpoint allows authentication using email and password. It only accepts requests from `127.0.0.1:5500` for security.

## Endpoint

**POST** `/api/auth/login`

## Request Restrictions

- **Origin:** Only accepts requests from `http://127.0.0.1:5500` or `http://localhost:5500`
- **IP:** Only accepts requests from `127.0.0.1` (localhost)

## Request Format

### Headers
```
Content-Type: application/json
Origin: http://127.0.0.1:5500
```

### Body
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "authenticated": true,
  "message": "Authentication successful",
  "user": {
    "uid": "user-id",
    "email": "user@example.com",
    "emailVerified": true,
    "name": "User Name",
    "picture": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastSignIn": "2024-01-01T00:00:00.000Z"
  },
  "tokens": {
    "idToken": "firebase-id-token",
    "refreshToken": "firebase-refresh-token",
    "expiresIn": "3600"
  }
}
```

### Error Responses

#### Missing Credentials (400)
```json
{
  "success": false,
  "authenticated": false,
  "error": "Missing credentials",
  "message": "Email and password are required"
}
```

#### Invalid Credentials (401)
```json
{
  "success": false,
  "authenticated": false,
  "error": "INVALID_LOGIN_CREDENTIALS",
  "message": "Invalid email or password"
}
```

#### Forbidden Origin (403)
```json
{
  "success": false,
  "authenticated": false,
  "error": "Forbidden",
  "message": "Requests from this origin are not allowed. Only requests from 127.0.0.1:5500 are accepted."
}
```

#### Configuration Error (500)
```json
{
  "success": false,
  "authenticated": false,
  "error": "Configuration error",
  "message": "Firebase Web API Key is not configured. Please set FIREBASE_WEB_API_KEY environment variable."
}
```

## Usage Example

### JavaScript/HTML (from 127.0.0.1:5500)

```javascript
// From your HTML page running on http://127.0.0.1:5500
async function login(email, password) {
  try {
    const response = await fetch('http://your-backend-url/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:5500'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    if (data.success && data.authenticated) {
      console.log('Login successful!', data.user);
      console.log('ID Token:', data.tokens.idToken);
      // Store token for subsequent requests
      localStorage.setItem('idToken', data.tokens.idToken);
      return data;
    } else {
      console.error('Login failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Usage
login('user@example.com', 'password123')
  .then(result => {
    if (result) {
      console.log('User authenticated:', result.user);
    }
  });
```

### cURL Example

```bash
curl -X POST http://your-backend-url/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://127.0.0.1:5500" \
  -d '{
    "email": "user@example.com",
    "password": "userpassword"
  }'
```

## Configuration

### Required Environment Variable

Set the Firebase Web API Key as an environment variable:

```bash
# Local development (.env file)
FIREBASE_WEB_API_KEY=AIzaSyB4z0HPzkI5YPsCVjWIQNyFbXsRc2MBkF0

# Firebase Functions
firebase functions:config:set firebase.web_api_key="AIzaSyB4z0HPzkI5YPsCVjWIQNyFbXsRc2MBkF0"
```

### Getting Your Firebase Web API Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`scanaraai`)
3. Go to **Project Settings** → **General**
4. Scroll down to **Your apps** section
5. Find your web app and copy the **API Key**

## Security Notes

1. **Origin Restriction:** Only requests from `127.0.0.1:5500` are accepted
2. **IP Restriction:** Only localhost IPs are allowed
3. **API Key:** Must be set as environment variable (never commit to git)
4. **HTTPS:** Use HTTPS in production for secure password transmission
5. **Token Storage:** Store tokens securely (not in localStorage for sensitive apps)

## Error Codes

| Error Code | Description |
|------------|-------------|
| `INVALID_EMAIL` | Invalid email address format |
| `INVALID_PASSWORD` | Invalid password format |
| `USER_DISABLED` | User account has been disabled |
| `USER_NOT_FOUND` | No user found with this email |
| `WRONG_PASSWORD` | Incorrect password |
| `EMAIL_NOT_FOUND` | No account found with this email |
| `INVALID_LOGIN_CREDENTIALS` | Invalid email or password |

## Testing

Test the endpoint from `http://127.0.0.1:5500`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login Test</title>
</head>
<body>
    <h1>Login Test</h1>
    <input type="email" id="email" placeholder="Email">
    <input type="password" id="password" placeholder="Password">
    <button onclick="login()">Login</button>
    <div id="result"></div>

    <script>
        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('http://your-backend-url/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Origin': 'http://127.0.0.1:5500'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                document.getElementById('result').innerHTML = JSON.stringify(data, null, 2);
            } catch (error) {
                document.getElementById('result').innerHTML = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>
```

