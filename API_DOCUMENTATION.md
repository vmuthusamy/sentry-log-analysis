# File Upload API Documentation

## POST /api/upload

Upload a log file for security analysis with comprehensive validation and size limits.

### Request

**Endpoint:** `POST /api/upload`

**Content-Type:** `multipart/form-data`

**Authentication:** Required (Session-based)

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `logFile` | File | Yes | Log file to upload (.txt or .log format) |
| `analysisMethod` | String | No | Analysis method: `traditional`, `advanced`, `ai`, `skip-llm` (default: `traditional`) |

### File Requirements

#### File Size Limits
- **Maximum file size**: 10MB (10,485,760 bytes)
- Files larger than 10MB will be rejected with HTTP 400
- Empty files (0 bytes) are not allowed

#### User File Limits
- **Maximum files per user**: 10 files total
- Users must delete existing files before uploading new ones when at limit
- File count is checked before upload processing

#### Supported File Types
- `.txt` files (text/plain MIME type)
- `.log` files (text/plain or application/octet-stream MIME type)
- Other file extensions are rejected

#### Content Validation
- **Maximum log entries**: 100,000 entries per file
- **Maximum line length**: 10,000 characters per line
- **Binary content**: Not allowed (files with binary headers rejected)
- **Security scanning**: Files are scanned for malicious patterns

#### Filename Requirements
- Maximum filename length: 255 characters
- Allowed characters: letters, numbers, dots, hyphens, underscores
- Invalid characters will cause rejection

### Rate Limits

- **File uploads**: 10 uploads per 15 minutes per user
- **Concurrent processing**: 3 files maximum per user
- **General API**: 100 requests per 15 minutes per user

### Success Response

**HTTP Status:** `200 OK`

```json
{
  "success": true,
  "message": "File uploaded successfully and queued for analysis",
  "file": {
    "id": "abc123",
    "filename": "security.log",
    "size": 1048576,
    "analysisMethod": "traditional",
    "uploadedAt": "2024-01-01T10:00:00Z"
  }
}
```

### Error Responses

#### File Too Large
**HTTP Status:** `400 Bad Request`
```json
{
  "message": "File size 15MB exceeds limit of 10MB"
}
```

#### Invalid File Type
**HTTP Status:** `400 Bad Request`
```json
{
  "message": "Only .txt and .log files are allowed"
}
```

#### Empty File
**HTTP Status:** `400 Bad Request`
```json
{
  "message": "Empty file is not allowed"
}
```

#### Invalid Format
**HTTP Status:** `400 Bad Request`
```json
{
  "message": "Invalid log file format",
  "details": {
    "expectedFormat": "Zscaler NSS feed format (comma, semicolon, tab or pipe separated)",
    "suggestion": "Please upload a valid Zscaler log file with proper field headers.",
    "fileName": "invalid-file.log"
  }
}
```

#### Too Many Log Entries
**HTTP Status:** `413 Payload Too Large`
```json
{
  "message": "File contains 150000 entries. Maximum allowed is 100,000 entries",
  "details": {
    "currentEntries": 150000,
    "maxEntries": 100000,
    "suggestion": "Please split your log file into smaller chunks or filter to fewer entries.",
    "fileName": "large-file.log"
  }
}
```

#### File Count Limit Reached
**HTTP Status:** `400 Bad Request`
```json
{
  "message": "You have reached the maximum limit of 10 files. Please delete some files before uploading new ones."
}
```

#### Rate Limit Exceeded
**HTTP Status:** `429 Too Many Requests`
```json
{
  "message": "Rate limit exceeded. Please wait before uploading again."
}
```

#### Security Threat Detected
**HTTP Status:** `400 Bad Request`
```json
{
  "message": "Security validation failed",
  "details": {
    "threats": [
      "Suspicious pattern detected on line 15: SQL injection attempt",
      "Binary content detected in log file"
    ]
  }
}
```

### Example Request

```bash
curl -X POST https://your-app.replit.app/api/upload \
  -F "logFile=@security.log" \
  -F "analysisMethod=traditional" \
  -H "Cookie: your-session-cookie"
```

### Example with JavaScript

```javascript
const formData = new FormData();
formData.append('logFile', fileInput.files[0]);
formData.append('analysisMethod', 'traditional');

fetch('/api/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include' // Include session cookies
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    console.log('File uploaded:', data.file);
  } else {
    console.error('Upload failed:', data.message);
  }
});
```

### Security Features

1. **Multi-layer validation**: File type, size, content, and security scanning
2. **Malicious pattern detection**: SQL injection, XSS, command injection protection
3. **Rate limiting**: Prevents abuse and system overload
4. **Secure file handling**: Temporary storage with automatic cleanup
5. **Content sanitization**: Log content is sanitized before storage
6. **Session-based authentication**: Secure user validation

### Supported Log Formats

The system primarily supports **Zscaler NSS (Network Security Service) feed format**:

- Comma-separated values (CSV)
- Semicolon-separated values
- Tab-separated values (TSV)
- Pipe-separated values

**Expected fields include:**
- Timestamp
- User/Source IP
- Destination IP/URL
- Action/Method
- Status Code
- Bytes transferred
- User Agent
- Category/Classification

## GET /api/user/file-count

Get the current file count and upload eligibility for the authenticated user.

### Request

**Endpoint:** `GET /api/user/file-count`

**Authentication:** Required (Session-based)

### Success Response

**HTTP Status:** `200 OK`

```json
{
  "count": 5,
  "limit": 10,
  "canUpload": true,
  "remaining": 5
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | Number | Current number of files for the user |
| `limit` | Number | Maximum files allowed per user (10) |
| `canUpload` | Boolean | Whether user can upload more files |
| `remaining` | Number | Number of additional files user can upload |

### Error Response

**HTTP Status:** `500 Internal Server Error`
```json
{
  "message": "Failed to fetch file count"
}
```

### Example Request

```bash
curl -X GET https://your-app.replit.app/api/user/file-count \
  -H "Cookie: your-session-cookie"
```

### Example with JavaScript

```javascript
fetch('/api/user/file-count', {
  credentials: 'include'
})
.then(response => response.json())
.then(data => {
  console.log(`User has ${data.count}/${data.limit} files`);
  console.log(`Can upload: ${data.canUpload}`);
});
```

### Performance Considerations

- Files are processed asynchronously to prevent blocking
- Large files (>1MB) are processed in batches
- Memory usage is optimized for files up to 10MB
- Processing timeout: 5 minutes per file
- Concurrent processing limited to prevent resource exhaustion
- User file limits prevent database overflow and improve performance