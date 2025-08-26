# 🏫 School Library Management System - Installation Guide

## 📋 Overview
This is a complete library management system designed specifically for schools. Each school gets their own isolated installation with a separate database, ensuring complete data privacy and independence.

## 🎯 Features
- ✅ **Book Management** - Add, edit, delete books
- ✅ **Member Management** - Student and staff registration
- ✅ **Borrowing System** - Track book loans and returns
- ✅ **Bulk Returns** - Return multiple books at once
- ✅ **History Tracking** - Immutable audit trail
- ✅ **Security** - Protected against data loss
- ✅ **Responsive Design** - Works on computers, tablets, phones
- ✅ **Offline Operation** - No internet connection required

## 📋 Prerequisites
Before installing, ensure the school has:

### **Required Software:**
- **Node.js** (version 14 or higher)
  - Download from: https://nodejs.org/
  - Choose the "LTS" version
  - Install with default settings

### **System Requirements:**
- **Windows 10/11** or **macOS** or **Linux**
- **4GB RAM** minimum (8GB recommended)
- **1GB free disk space**
- **Modern web browser** (Chrome, Firefox, Safari, Edge)

## 🚀 Quick Installation (Windows)

### **Step 1: Download the System**
1. Copy the school folder to the computer
2. Extract the ZIP file if needed
3. Place the folder in a permanent location (e.g., `C:\LibrarySystem\`)

### **Step 2: Install Dependencies**
1. Open the school folder
2. **Double-click `install.bat`**
3. Wait for installation to complete
4. You'll see "Installation complete!" message

### **Step 3: Start the System**
1. In the same folder, **double-click `start-library.bat`** (if available)
2. Or open Command Prompt in the folder and run: `npm start`
3. You'll see: "Library system running at http://localhost:3000"

### **Step 4: Access the System**
1. Open any web browser
2. Go to: **http://localhost:3000**
3. The library system is now ready to use!

## 🚀 Quick Installation (macOS/Linux)

### **Step 1: Download the System**
1. Copy the school folder to the computer
2. Extract the ZIP file if needed
3. Place the folder in a permanent location

### **Step 2: Install Dependencies**
1. Open Terminal
2. Navigate to the school folder: `cd /path/to/school/folder`
3. Run: `chmod +x install.sh && ./install.sh`
4. Wait for installation to complete

### **Step 3: Start the System**
1. In the same terminal, run: `npm start`
2. You'll see: "Library system running at http://localhost:3000"

### **Step 4: Access the System**
1. Open any web browser
2. Go to: **http://localhost:3000**
3. The library system is now ready to use!

## 📊 Database Information

### **Database File:**
- **Location:** Same folder as the system
- **Filename:** `[SCHOOL_CODE]-library.db`
- **Example:** `SHS-library.db` for Springfield High School

### **Database Backup:**
- **To backup:** Copy the `.db` file to a safe location
- **To restore:** Replace the `.db` file with your backup
- **Automatic backup:** Create a copy daily/weekly

## 🔧 Configuration

### **School Settings:**
Edit `school-config.json` to customize:
```json
{
  "schoolName": "Your School Name",
  "schoolCode": "YSC",
  "port": 3000,
  "adminEmail": "admin@yourschool.edu",
  "contactPhone": "555-0000"
}
```

### **Change Port (if needed):**
If port 3000 is busy, change the port in `school-config.json`:
```json
{
  "port": 3001
}
```

## 📚 Getting Started

### **First Time Setup:**
1. **Add Books:**
   - Click "Add Book" in the Books section
   - Enter title, author, ISBN
   - Click "Add Book"

2. **Add Members (Students):**
   - Click "Add Member" in the Members section
   - Enter name, email, phone
   - Click "Add Member"

3. **Add Staff:**
   - Go to http://localhost:3000/staff
   - Click "Add Staff"
   - Enter staff details
   - Click "Add Staff"

### **Daily Operations:**
1. **Borrowing Books:**
   - Find the book in the Books table
   - Click "Borrow"
   - Select member/staff
   - Click "Borrow"

2. **Returning Books:**
   - Find the book in the Books table
   - Click "Return"
   - Or use bulk return for multiple books

3. **Managing Users:**
   - Add new students/staff as needed
   - Edit existing information
   - View borrowing history

## 🔒 Security Features

### **Data Protection:**
- ✅ **Cannot delete users** with borrowing history
- ✅ **Cannot delete books** that are borrowed
- ✅ **Cannot delete books** with borrowing history
- ✅ **History is immutable** - cannot be modified or deleted

### **Backup Recommendations:**
- **Daily backup** of the database file
- **Weekly backup** to external drive
- **Monthly backup** to cloud storage
- **Before updates** - always backup first

## 🆘 Troubleshooting

### **Common Issues:**

#### **"Port already in use" Error:**
1. Change port in `school-config.json`
2. Restart the system
3. Access with new port (e.g., http://localhost:3001)

#### **"Cannot find module" Error:**
1. Run: `npm install`
2. Make sure Node.js is installed
3. Check internet connection for dependencies

#### **System won't start:**
1. Check if another instance is running
2. Restart the computer
3. Check firewall settings
4. Ensure port is not blocked

#### **Database errors:**
1. Check if database file exists
2. Ensure write permissions
3. Restore from backup if needed

### **Getting Help:**
1. Check this README file
2. Look at error messages carefully
3. Contact system administrator
4. Check Node.js installation

## 📱 Using the System

### **Main Page (http://localhost:3000):**
- **Books Section:** Manage all books
- **Members Section:** Manage students
- **Borrowing:** Lend and return books

### **Staff Page (http://localhost:3000/staff):**
- **Staff Management:** Add/edit staff members
- **Staff Borrowing:** Track staff book loans

### **History Page (http://localhost:3000/history):**
- **Audit Trail:** View all borrowing activities
- **Reports:** Track usage patterns
- **Immutable Log:** Cannot be modified

## 🔄 Updates and Maintenance

### **Updating the System:**
1. **Backup current database**
2. **Download new version**
3. **Replace old files** (except database)
4. **Restart the system**
5. **Test functionality**

### **Regular Maintenance:**
- **Weekly:** Check system is running
- **Monthly:** Backup database
- **Quarterly:** Review and clean up data
- **Annually:** Update system if needed

## 📞 Support Information

### **School Administrator:**
- **Email:** [Your Email]
- **Phone:** [Your Phone]
- **Hours:** [Support Hours]

### **Technical Requirements:**
- **Node.js:** https://nodejs.org/
- **Web Browser:** Chrome, Firefox, Safari, Edge
- **Storage:** 1GB free space minimum

### **Emergency Contacts:**
- **IT Support:** [School IT Contact]
- **System Admin:** [Your Contact]
- **Backup Location:** [Where backups are stored]

## 🎉 Congratulations!

Your school library system is now installed and ready to use! 

### **Next Steps:**
1. **Add your first books**
2. **Register students and staff**
3. **Start borrowing and returning books**
4. **Train library staff on the system**
5. **Set up regular backups**

### **Remember:**
- ✅ **Backup regularly**
- ✅ **Keep the system running**
- ✅ **Train users properly**
- ✅ **Contact support if needed**

---

**🏫 Library Management System for Schools**  
**📅 Installation Date:** [Date]  
**👨‍💼 Installed By:** [Your Name]  
**📧 Contact:** [Your Email]

*This system provides complete library management with data privacy and security for your school.* 