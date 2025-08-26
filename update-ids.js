const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('library.db');

db.serialize(() => {
  db.run("UPDATE members SET admId = 'ADM' || id WHERE admId IS NULL OR admId = ''", function(err) {
    if (err) {
      console.error('Error updating members:', err.message);
    } else {
      console.log('Updated members with default admId.');
    }
  });
  db.run("UPDATE staff SET tscNumber = 'TSC' || id WHERE tscNumber IS NULL OR tscNumber = ''", function(err) {
    if (err) {
      console.error('Error updating staff:', err.message);
    } else {
      console.log('Updated staff with default tscNumber.');
    }
  });
});

db.close(); 