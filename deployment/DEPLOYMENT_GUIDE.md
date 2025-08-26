# 🏫 School Library System Deployment Guide

## 📋 Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

## 🚀 Quick Installation for Schools

### Option 1: Windows
1. Download the school folder
2. Double-click `install.bat`
3. Wait for installation to complete
4. Run `npm start` to start the system

### Option 2: Linux/Mac
1. Download the school folder
2. Open terminal in the folder
3. Run: `chmod +x install.sh && ./install.sh`
4. Run: `npm start` to start the system

## 🌐 Access the System
- Open browser and go to: http://localhost:3000
- The system will be ready to use

## 📊 Database
- Each school has its own database file
- Database: `[SCHOOL_CODE]-library.db`
- Data is completely isolated between schools

## 🔧 Configuration
- Edit `school-config.json` to customize school settings
- Change port number if needed
- Update contact information

## 📚 Features
- Add/Edit/Delete Books, Members, Staff
- Borrow/Return books
- Bulk return for multiple books
- Immutable history tracking
- Security protections
- Responsive web interface

## 🆘 Support
- Each school installation is independent
- No shared data between schools
- Easy backup: just copy the database file
- Easy migration: copy database to new server

## 🔒 Security
- All data stored locally
- No internet connection required
- Database file can be backed up easily
- History cannot be modified or deleted

---
*Library Management System for Schools*
