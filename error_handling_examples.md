# 10 Examples of Error Handling

## 1. File Not Found Error

**Error Scenario**: Attempting to read a file that doesn't exist

```python
# Problematic code
def read_config():
    with open('config.txt', 'r') as file:
        return file.read()

# Error handling solution
def read_config():
    try:
        with open('config.txt', 'r') as file:
            return file.read()
    except FileNotFoundError:
        print("Config file not found. Using default settings.")
        return create_default_config()
    except PermissionError:
        print("Permission denied to read config file.")
        return None
```

**Handling Strategy**: Use try-catch blocks with specific exception types and provide fallback mechanisms.

---

## 2. Network Connection Error

**Error Scenario**: API request fails due to network issues

```javascript
// Error handling with async/await
async function fetchUserData(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`, {
            timeout: 5000
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request timed out');
            return { error: 'Request timeout' };
        } else if (error.message.includes('Failed to fetch')) {
            console.log('Network error occurred');
            return { error: 'Network unavailable' };
        } else {
            console.log('Unexpected error:', error.message);
            return { error: 'Unknown error occurred' };
        }
    }
}
```

**Handling Strategy**: Implement timeout mechanisms, distinguish between different network error types, and provide meaningful user feedback.

---

## 3. Database Connection Error

**Error Scenario**: Database connection fails or query times out

```python
import psycopg2
from psycopg2 import OperationalError, DatabaseError
import time

def execute_query_with_retry(query, max_retries=3):
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            conn = psycopg2.connect(
                host="localhost",
                database="mydb",
                user="user",
                password="password"
            )
            cursor = conn.cursor()
            cursor.execute(query)
            result = cursor.fetchall()
            conn.close()
            return result
            
        except OperationalError as e:
            retry_count += 1
            print(f"Connection failed (attempt {retry_count}): {e}")
            if retry_count < max_retries:
                time.sleep(2 ** retry_count)  # Exponential backoff
            else:
                raise Exception("Max retries exceeded")
                
        except DatabaseError as e:
            print(f"Database error: {e}")
            raise  # Don't retry on database errors
```

**Handling Strategy**: Implement retry logic with exponential backoff, distinguish between recoverable and non-recoverable errors.

---

## 4. Input Validation Error

**Error Scenario**: User provides invalid input data

```java
public class UserValidator {
    public static class ValidationException extends Exception {
        public ValidationException(String message) {
            super(message);
        }
    }
    
    public static void validateUser(String email, int age) throws ValidationException {
        List<String> errors = new ArrayList<>();
        
        if (email == null || !email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            errors.add("Invalid email format");
        }
        
        if (age < 0 || age > 120) {
            errors.add("Age must be between 0 and 120");
        }
        
        if (!errors.isEmpty()) {
            throw new ValidationException("Validation failed: " + String.join(", ", errors));
        }
    }
    
    // Usage with error handling
    public static void createUser(String email, int age) {
        try {
            validateUser(email, age);
            // Proceed with user creation
            System.out.println("User created successfully");
        } catch (ValidationException e) {
            System.err.println("User creation failed: " + e.getMessage());
            // Log error and return appropriate response to client
        }
    }
}
```

**Handling Strategy**: Collect all validation errors, provide specific error messages, and prevent processing invalid data.

---

## 5. Memory/Resource Exhaustion Error

**Error Scenario**: Application runs out of memory or system resources

```python
import psutil
import gc

def process_large_dataset(data_source):
    try:
        # Monitor memory usage
        memory_threshold = 80  # 80% memory usage threshold
        
        results = []
        batch_size = 1000
        
        for batch in get_data_batches(data_source, batch_size):
            # Check memory usage before processing
            memory_percent = psutil.virtual_memory().percent
            if memory_percent > memory_threshold:
                # Force garbage collection
                gc.collect()
                
                # Check again after cleanup
                if psutil.virtual_memory().percent > memory_threshold:
                    print(f"Memory usage high ({memory_percent}%). Processing batch to disk.")
                    save_partial_results(results)
                    results = []
            
            try:
                processed_batch = process_batch(batch)
                results.extend(processed_batch)
            except MemoryError:
                print("Memory error encountered. Reducing batch size.")
                return process_large_dataset_reduced_batch(data_source)
                
        return results
        
    except Exception as e:
        print(f"Unexpected error during processing: {e}")
        # Cleanup any partial results
        cleanup_temp_files()
        raise
```

**Handling Strategy**: Monitor resource usage, implement batch processing, graceful degradation, and cleanup procedures.

---

## 6. Authentication/Authorization Error

**Error Scenario**: User authentication fails or lacks proper permissions

```python
from functools import wraps
import jwt

class AuthError(Exception):
    def __init__(self, message, status_code):
        self.message = message
        self.status_code = status_code

def require_auth(required_role=None):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                token = request.headers.get('Authorization')
                if not token:
                    raise AuthError("No token provided", 401)
                
                # Remove 'Bearer ' prefix
                token = token.replace('Bearer ', '')
                
                try:
                    payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
                except jwt.ExpiredSignatureError:
                    raise AuthError("Token has expired", 401)
                except jwt.InvalidTokenError:
                    raise AuthError("Invalid token", 401)
                
                # Check role if required
                if required_role and payload.get('role') != required_role:
                    raise AuthError("Insufficient permissions", 403)
                
                # Add user info to request context
                request.user = payload
                return f(*args, **kwargs)
                
            except AuthError as e:
                return jsonify({'error': e.message}), e.status_code
            
        return wrapper
    return decorator

# Usage
@app.route('/admin/users')
@require_auth(required_role='admin')
def get_all_users():
    return jsonify(users)
```

**Handling Strategy**: Use decorators for consistent auth checks, provide specific error codes, and implement role-based access control.

---

## 7. JSON Parsing Error

**Error Scenario**: Malformed JSON data causes parsing failure

```javascript
function parseJsonSafely(jsonString, defaultValue = null) {
    try {
        // Validate input
        if (typeof jsonString !== 'string') {
            throw new Error('Input must be a string');
        }
        
        if (jsonString.trim() === '') {
            throw new Error('Empty JSON string');
        }
        
        const parsed = JSON.parse(jsonString);
        
        // Additional validation if needed
        if (parsed === null) {
            console.warn('Parsed JSON is null');
        }
        
        return parsed;
        
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.error('Invalid JSON syntax:', error.message);
            console.error('Problematic JSON:', jsonString.substring(0, 100) + '...');
        } else {
            console.error('JSON parsing error:', error.message);
        }
        
        // Return default value or re-throw based on requirements
        if (defaultValue !== null) {
            return defaultValue;
        } else {
            throw new Error(`Failed to parse JSON: ${error.message}`);
        }
    }
}

// Usage with error handling
function processApiResponse(response) {
    const data = parseJsonSafely(response, { error: 'Invalid response format' });
    
    if (data.error) {
        console.log('Using fallback data due to parsing error');
        return handleFallbackData();
    }
    
    return processValidData(data);
}
```

**Handling Strategy**: Validate input before parsing, provide detailed error messages, and implement fallback mechanisms.

---

## 8. Type Error and Type Safety

**Error Scenario**: Incorrect data types cause runtime errors

```typescript
// Define interfaces for type safety
interface User {
    id: number;
    name: string;
    email: string;
    age?: number;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// Type guard functions
function isUser(obj: any): obj is User {
    return obj &&
           typeof obj.id === 'number' &&
           typeof obj.name === 'string' &&
           typeof obj.email === 'string' &&
           (obj.age === undefined || typeof obj.age === 'number');
}

function processUserData(userData: unknown): ApiResponse<User> {
    try {
        // Runtime type validation
        if (!isUser(userData)) {
            return {
                success: false,
                error: 'Invalid user data format'
            };
        }
        
        // Additional business logic validation
        if (userData.age !== undefined && (userData.age < 0 || userData.age > 120)) {
            return {
                success: false,
                error: 'Invalid age range'
            };
        }
        
        // Process the validated data
        const processedUser: User = {
            ...userData,
            email: userData.email.toLowerCase().trim()
        };
        
        return {
            success: true,
            data: processedUser
        };
        
    } catch (error) {
        return {
            success: false,
            error: `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
```

**Handling Strategy**: Use TypeScript for compile-time type checking, implement runtime type guards, and validate data at boundaries.

---

## 9. Timeout Error

**Error Scenario**: Operations take longer than expected time limits

```python
import asyncio
import aiohttp
from contextlib import asynccontextmanager

class TimeoutError(Exception):
    pass

@asynccontextmanager
async def timeout_context(seconds):
    try:
        yield await asyncio.wait_for(asyncio.create_task(asyncio.sleep(0)), timeout=seconds)
    except asyncio.TimeoutError:
        raise TimeoutError(f"Operation timed out after {seconds} seconds")

async def fetch_with_timeout(url, timeout_seconds=10):
    try:
        async with aiohttp.ClientSession() as session:
            async with asyncio.timeout(timeout_seconds):
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        raise aiohttp.ClientResponseError(
                            request_info=response.request_info,
                            history=response.history,
                            status=response.status
                        )
                        
    except asyncio.TimeoutError:
        print(f"Request to {url} timed out after {timeout_seconds} seconds")
        return {"error": "timeout", "url": url}
    except aiohttp.ClientError as e:
        print(f"Client error: {e}")
        return {"error": "client_error", "message": str(e)}
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {"error": "unexpected", "message": str(e)}

# Usage with multiple timeout strategies
async def robust_fetch(url):
    # Try with progressively longer timeouts
    timeouts = [5, 10, 30]
    
    for timeout in timeouts:
        result = await fetch_with_timeout(url, timeout)
        
        if "error" not in result or result["error"] != "timeout":
            return result
        
        print(f"Timeout with {timeout}s, trying longer timeout...")
    
    return {"error": "max_timeout_exceeded", "url": url}
```

**Handling Strategy**: Implement progressive timeout strategies, provide fallback options, and use async/await for non-blocking operations.

---

## 10. Configuration and Environment Error

**Error Scenario**: Missing or invalid configuration causes application startup failure

```python
import os
from dataclasses import dataclass
from typing import Optional
import logging

@dataclass
class AppConfig:
    database_url: str
    api_key: str
    debug_mode: bool = False
    port: int = 8000
    log_level: str = "INFO"

class ConfigurationError(Exception):
    pass

def load_config() -> AppConfig:
    """Load and validate application configuration."""
    errors = []
    
    # Required environment variables
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        errors.append("DATABASE_URL environment variable is required")
    
    api_key = os.getenv('API_KEY')
    if not api_key:
        errors.append("API_KEY environment variable is required")
    elif len(api_key) < 32:
        errors.append("API_KEY must be at least 32 characters long")
    
    # Optional with defaults and validation
    try:
        port = int(os.getenv('PORT', '8000'))
        if port < 1 or port > 65535:
            errors.append("PORT must be between 1 and 65535")
    except ValueError:
        errors.append("PORT must be a valid integer")
        port = 8000
    
    debug_mode = os.getenv('DEBUG', 'false').lower() in ('true', '1', 'yes')
    
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    if log_level not in ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'):
        errors.append("LOG_LEVEL must be one of: DEBUG, INFO, WARNING, ERROR, CRITICAL")
        log_level = 'INFO'
    
    # Report all configuration errors at once
    if errors:
        error_msg = "Configuration errors:\n" + "\n".join(f"- {error}" for error in errors)
        raise ConfigurationError(error_msg)
    
    return AppConfig(
        database_url=database_url,
        api_key=api_key,
        debug_mode=debug_mode,
        port=port,
        log_level=log_level
    )

def initialize_app():
    """Initialize application with proper error handling."""
    try:
        config = load_config()
        
        # Setup logging
        logging.basicConfig(level=getattr(logging, config.log_level))
        logger = logging.getLogger(__name__)
        
        logger.info("Configuration loaded successfully")
        logger.info(f"Starting application on port {config.port}")
        
        return config
        
    except ConfigurationError as e:
        print(f"Configuration Error: {e}")
        print("\nPlease check your environment variables and try again.")
        print("Required variables: DATABASE_URL, API_KEY")
        print("Optional variables: PORT, DEBUG, LOG_LEVEL")
        exit(1)
        
    except Exception as e:
        print(f"Unexpected error during initialization: {e}")
        exit(1)

# Usage
if __name__ == "__main__":
    config = initialize_app()
    # Continue with application startup...
```

**Handling Strategy**: Validate all configuration at startup, provide clear error messages with remediation steps, and fail fast with helpful guidance.

---

## Key Error Handling Principles

1. **Fail Fast**: Detect and report errors as early as possible
2. **Specific Error Types**: Use specific exception types for different error conditions
3. **Graceful Degradation**: Provide fallback mechanisms when possible
4. **Comprehensive Logging**: Log errors with sufficient context for debugging
5. **User-Friendly Messages**: Provide clear, actionable error messages to users
6. **Resource Cleanup**: Always clean up resources in error scenarios
7. **Retry Logic**: Implement appropriate retry mechanisms for transient failures
8. **Monitoring**: Include error metrics and alerting in production systems
9. **Documentation**: Document expected errors and handling strategies
10. **Testing**: Include error scenarios in your test suite