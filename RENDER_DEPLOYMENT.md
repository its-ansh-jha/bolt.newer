# Deploy to Render - Quick Guide

This guide will help you deploy your Website Builder AI app on Render.

## Pre-deployment Checklist

✅ Root `package.json` created with build scripts
✅ Backend configured to serve frontend in production
✅ All dependencies properly set up

## Render Deployment Settings

When creating a new Web Service on Render, use these settings:

### Build Command
```
npm run build
```

### Start Command
```
npm start
```

### Environment Variables

You must add these environment variables in Render's dashboard:

1. **NODE_ENV**
   - Value: `production`

2. **OPENROUTER_API_KEY**
   - Value: Your OpenRouter API key
   - Get it from: https://openrouter.ai/

3. **PORT**
   - Render automatically sets this, no action needed

## Step-by-Step Deployment

1. **Push your code to GitHub** (if not already done)

2. **Create a New Web Service on Render**
   - Go to https://render.com/
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure the Service**
   - **Name**: Choose a name for your app
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Choose Free or Starter

4. **Add Environment Variables**
   - Click "Environment" in the sidebar
   - Add `NODE_ENV` = `production`
   - Add `OPENROUTER_API_KEY` = your actual API key

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - Wait for the build to complete (this may take 5-10 minutes)

## What Happens During Build

The build process runs these steps automatically:

1. Installs backend dependencies (`cd be && npm install`)
2. Installs frontend dependencies (`cd frontend && npm install`)
3. Compiles backend TypeScript (`cd be && npx tsc -b`)
4. Builds frontend React app (`cd frontend && npm run build`)
5. Starts the Express server which serves both API and frontend

## After Deployment

Once deployed, your app will be available at:
`https://your-app-name.onrender.com`

The Express server will:
- Handle API requests at `/template` and `/chat`
- Serve your React frontend for all other routes
- Support React Router navigation

## Troubleshooting

**Build fails?**
- Check that all environment variables are set correctly
- Look at the build logs for specific error messages

**App loads but API doesn't work?**
- Verify your OPENROUTER_API_KEY is set correctly
- Check the runtime logs in Render dashboard

**Frontend doesn't load?**
- Make sure NODE_ENV is set to "production"
- Check that the frontend build completed successfully

## Notes

- Free tier: App goes to sleep after 15 minutes of inactivity
- First request after sleep may take 30-60 seconds
- Consider upgrading to Starter plan for better performance
