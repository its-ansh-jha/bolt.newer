#!/bin/bash

# Start backend in background
(cd be && node dist/index.js) &

# Start frontend
cd frontend && npm run dev
