"use strict";
window.onload = function () {

  // Use cursor instead of get in search(), as we need the primaryKey.
  // Need to move past current object if primaryKey is set.
  //begin handler_search
  document.querySelector("#search").addEventListener("click",
    function () {
      fillForm();
      search(document.querySelector("#search-key").value, "next", 0);
    }
  );

  //begin handler_count
  document.querySelector("#count").addEventListener("click",
    function () {
      db
      .transaction("dbCONTACTS")
      .objectStore("dbCONTACTS")
      .count()
      .onsuccess = function (event) {
        // alert(event.target.result + " objects in database");
        showMessage(`There are ${event.target.result} objects in database`, true);
      };
    }
  );
  //end

  //begin handler_prev
  document.querySelector("#prev").addEventListener("click",
    function () {
      search(document.querySelector("#field-lastName").value, "prev",
        document.querySelector("#field-primaryKey").value);
    }
  );
  //end

  //begin handler_next
  document.querySelector("#next").addEventListener("click",
    function () {
      search(document.querySelector("#field-lastName").value, "next",
        document.querySelector("#field-primaryKey").value);
    }
  );
  //end

  //begin handler_clear
  document.querySelector("#clear").addEventListener("click",
    function () {
      fillForm();
    }
  );
  //end

  //begin import_code
  document.querySelector("#import").addEventListener("click", importData);

  // handle deletions
  document.querySelector("#delete").addEventListener("click", handleDelete);

  document.querySelector("#save").addEventListener("click", saveContact);

  openDatabase();

} // end onload

var db;
const dbVERSION = 1;
const dbNAME = "tree4hope";
const dbCONTACTS = "contacts";
// reference:
// http://geekslop.com/2016/recommended-data-length-limits-common-database-programming-fields
var contactMetaData = {
    'lastName': {'type': 'text', 'size': 50, 'required': true},
    'firstName': {'type': 'text', 'size': 50, 'required': true},
    'address1': {'type': 'text', 'size': 100, 'required': true},
    'address2': {'type': 'text', 'size': 100, 'required': false},
    'city': {'type': 'text', 'size': 60, 'required': true},
    'state': {'type': 'text', 'size': 50, 'required': true},
    'zip4': {'type': 'text', 'size': 9, 'required': true},
    'country': {'type': 'text', 'size': 55, 'required': true},
    'email1': {'type': 'email', 'size': 65, 'required': true},
    'tele1': {'type': 'tel', 'size': 15, 'required': true},
    'tele2': {'type': 'tel', 'size': 15, 'required': false},
    // following are all required but handled internally
    'primaryKey': {'type': 'number', 'required': false},
    'dateCreated': {'type': 'number', 'required': false},
    'dateUpdated': {'type': 'number', 'required': false}
  };

const testDataName = function() {
  for (let field in contactMetaData) {
    console.log(`field = ${field}`);
    console.log(`  type = ${contactMetaData[field]['type']}`);
    console.log(`  size = ${contactMetaData[field]['size']}`);
    // fillForm() function
    console.log(`document.querySelector("#field-${field}").value = val(object.${field});`);
    // getForm() function ! watch comma on last field !
    console.log(`${field}: document.querySelector("#field-${field}").value,`);
  }
}

// openDatabase();

function openDatabase() {
  var request = indexedDB.open("dbNAME", dbVERSION);
  request.onsuccess = function(event) {
    db = request.result;
    db.onerror = errorHandler;
    showMessage("Database opened", true);
  };
  request.onerror = errorHandler;
  request.onupgradeneeded = function(event) {
    db = event.target.result;
    var store = db.createObjectStore("dbCONTACTS", { autoIncrement: true });
    store.createIndex("lastNameIndex", "lastName", { unique: false });
  };
}


function importData() {
  chrome.fileSystem.chooseEntry(
    {
      type: "openFile"
    },
    function (entry) {
      if (entry) {
        entry.file(
          function (file) {
            var reader = new FileReader();
            reader.onloadend = function() {
              var objects = JSON.parse(this.result);
              loadData(objects);
              showMessage("Opened OK", true);
            };
            reader.readAsText(file);
          },
          errorHandler
        );
      }
    }
  );
}
//end

function loadData(objects) {
  var transaction = db.transaction("dbCONTACTS", "readwrite");
  transaction.oncomplete = function(event) {
    showMessage(objects.length + " objects imported", true);
  };
  var store = transaction.objectStore("dbCONTACTS");
  for (var x of objects)
    store.add(x);
}


function search(key, dir, primaryKey) {
  primaryKey = parseInt(primaryKey);
  var range;
  if (dir === "next")
    range = IDBKeyRange.lowerBound(key, false);
  else
    range = IDBKeyRange.upperBound(key, false);

  // debugger

  db
  .transaction("dbCONTACTS")
  .objectStore("dbCONTACTS")
  .index("lastNameIndex")
  .openCursor(range, dir)
  .onsuccess = function (event) {
    var cursor = event.target.result;
    if (cursor) {
      if (primaryKey > 0) {
        if (primaryKey === cursor.primaryKey)
          primaryKey = 0;
        cursor.continue();
      }
      else {
        showMessage("");
        fillForm(cursor.value, cursor.primaryKey);
      }
    }
    else
      showMessage("Not found");
  };
}
//end


//begin handler_delete
const handleDelete = function () {
    var primaryKey = parseInt(document.querySelector("#field-primaryKey").value);
    // console.log(`handleDelete: ${primaryKey}`);
    if (primaryKey > 0) {
      db
      .transaction("dbCONTACTS", "readwrite")
      .objectStore("dbCONTACTS")
      .delete(primaryKey)
      .onsuccess = function (event) {
        fillForm();
        showMessage("Deleted", true);
      };
    }
  };
//end

//begin handler_save
const saveContact =  function () {
    var store = db
      .transaction("dbCONTACTS", "readwrite")
      .objectStore("dbCONTACTS");
    var object = getForm();
    var key = document.querySelector("#field-primaryKey").value;
    var primaryKey = key ? parseInt(key) : 0;

    if (primaryKey === 0) { // add new record
      // current timestamp in milliseconds (milliseconds since 1970/01/01)
      object.dateCreated = Math.floor(Date.now());
      object.dateUpdated = object.dateCreated;
      store
      .add(object)
      .onsuccess = function (event) {
        // once added the new record stays on screen for visual confirmation
        // the user may choose to edit the new record
        // make sure dates are not lost on newly created record
        document.querySelector("#field-dateCreated").value = object.dateCreated;
        document.querySelector("#field-dateUpdated").value = object.dateUpdated;

        // Any event object that is received by onsuccess handler always has
        //  event.target.result. In this case it is key of record just added.
        let key = event.target.result;
        /*
         this prevents a duplicate record being added if user decides to
         edit the newly created record as key needs put in the hidden field
        */
        document.querySelector("#field-primaryKey").value = key;
        showMessage(`Added: index key = ${key}`, true);
      };
    }
    else {  // update existing record
      object.dateUpdated = Math.floor(Date.now());
      store
      .put(object, primaryKey)
      .onsuccess = function (event) {
        showMessage("Updated", true);
      };
    }
  };
//end

//begin fillForm_code
function fillForm(object, primaryKey) {
  if (!object)
    object = {};
  if (!primaryKey)
    primaryKey = 0;
  for (let field in contactMetaData) {
    if (field === "primaryKey") {
      document.querySelector("#field-primaryKey").value = primaryKey;
    } else {
      document.querySelector("#field-" + field).value = val(object[field]);
    }
  }
}

function val(x) {
  return x ? x : "";
}
//end

function getForm() {
  let formData = {};

  for (let field in contactMetaData) {
    formData[field] = document.querySelector("#field-" + field).value;
  }
  return formData;
}

var timeoutID;

function showMessage(msg, good) {
  if (msg) console.log(msg);
  var messageElement = document.querySelector("#message");
  messageElement.style.color = good ? "green" : "red";
  messageElement.innerHTML = msg;
  if (timeoutID)
    clearTimeout(timeoutID);
  // clear message after 5 seconds
  timeoutID = setTimeout(
    function () {
      messageElement.innerHTML = "&nbsp;";
    },
    5000
  );
}

function errorHandler(e) {
  console.dir(e);
  var msg;
  if (e.target && e.target.error)
    e = e.target.error;
  if (e.message)
    msg = e.message;
  else if (e.name)
    msg = e.name;
  else if (e.code)
    msg = "Code " + e.code;
  else
    msg = e.toString();
  showMessage("Error: " + msg);
}


