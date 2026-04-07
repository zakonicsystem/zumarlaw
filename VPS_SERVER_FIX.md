# VPS Server.js Fix Instructions

## Problem
Backend returns 502 Bad Gateway → Server is crashing
Root cause: Old code with malformed Express route pattern

## Quick Fix (SSH into VPS)

```bash
# 1. Connect to VPS
ssh root@your-vps-ip

# 2. Navigate to server directory
cd /var/www/Zakonics-System/server

# 3. Backup current server.js
cp server.js server.js.backup

# 4. Check what's at the end of server.js
tail -50 server.js
```

## Look for and REMOVE this problematic code:

```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});
```

OR

```javascript
app.use((req, res, next) => {
  // If the request doesn't match any API routes
  if (!req.path.startsWith('/api') && !req.path.includes('.')) {
    res.sendFile(path.join(distDir, 'index.html'));
  } else {
    next();
  }
});
```

## The CORRECT end of server.js should be:

```javascript
app.use('/chat', chatRoutes);
app.use('/attendance', attendanceRoutes);
app.get('/test', (req, res) => res.json({ test: 'server ok' }));

// ✅ Serve compiled frontend from dist directory
const distDir = path.join(__dirname, '../client/dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});

// Connect MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

export default app;
```

## Steps to Fix:

1. **Open server.js in nano editor:**
   ```bash
   nano server.js
   ```

2. **Go to the end of file (Ctrl+End or Ctrl+V for page down)**

3. **Find and DELETE the `app.get('*', ...)` or malformed `app.use((req, res, next) => {...})` block**

4. **Save and exit (Ctrl+X, then Y, then Enter)**

5. **Verify the fix:**
   ```bash
   tail -30 server.js
   ```

6. **Restart the PM2 app:**
   ```bash
   pm2 restart backend
   # Wait 5 seconds
   pm2 logs backend
   ```

7. **Expected output:**
   ```
   🚀 Server running on port 5000
   ```

8. **Test the login endpoint:**
   ```bash
   curl -X POST https://app.zumarlawfirm.com/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"test"}'
   ```

## If still getting 502 error:

1. **Check if MongoDB is connected:**
   ```bash
   pm2 logs backend | grep -i "mongodb\|error"
   ```

2. **Verify .env file has MONGO_URI:**
   ```bash
   cat .env | grep MONGO_URI
   ```

3. **If MONGO_URI is missing, add it:**
   ```bash
   echo "MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/zumarlawfirm" >> .env
   ```

4. **Restart server:**
   ```bash
   pm2 restart backend
   pm2 logs backend
   ```

## Check server logs for errors:
```bash
# Real-time logs
pm2 logs backend

# Last 100 lines
pm2 logs backend --lines 100

# Clear old logs
pm2 flush
```
