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
				alert(event.target.result + ' objects in database');
			};
		}
	);
	//end

	//begin handler_prev
	document.querySelector("#prev").addEventListener("click",
		function () {
			search(document.querySelector("#field-last").value, "prev",
			  document.querySelector("#field-primaryKey").value);
		}
	);
	//end

	//begin handler_next
	document.querySelector("#next").addEventListener("click",
		function () {
			search(document.querySelector("#field-last").value, "next",
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
const dbNAME = 'tree4hope';
const dbCONTACTS = 'contacts';

// openDatabase();

function openDatabase() {
	var request = indexedDB.open("dbNAME", dbVERSION);
	request.onsuccess = function(event) {
		db = request.result;
		db.onerror = errorHandler;
		showMessage('Database opened', true);
	};
	request.onerror = errorHandler;
	request.onupgradeneeded = function(event) {
		var db = event.target.result;
		var store = db.createObjectStore("dbCONTACTS", { autoIncrement: true });
		store.createIndex("lastNameIndex", "last", { unique: false });
	};
}


function importData() {
	chrome.fileSystem.chooseEntry(
		{
			type: 'openFile'
		},
		function (entry) {
			if (entry) {
				entry.file(
					function (file) {
						var reader = new FileReader();
						reader.onloadend = function() {
							var objects = JSON.parse(this.result);
							loadData(objects);
							showMessage('Opened OK', true);
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
		showMessage(objects.length + ' objects imported', true);
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
				showMessage('');
				fillForm(cursor.value, cursor.primaryKey);
			}
		}
		else
			showMessage('Not found');
	};
}
//end


//begin handler_delete
const handleDelete =function () {
		var primaryKey =
		  parseInt(document.querySelector("#field-primaryKey").value);
		if (primaryKey > 0) {
			db
			.transaction("dbCONTACTS", "readwrite")
			.objectStore("dbCONTACTS")
			.delete(primaryKey)
			.onsuccess = function (event) {
				fillForm();
				showMessage('Deleted', true);
			};
		}
	};
//end

//begin handler_save
const saveContact =	function () {
		var store = db
			.transaction("dbCONTACTS", "readwrite")
			.objectStore("dbCONTACTS");
		var object = getForm();
		var key = document.querySelector("#field-primaryKey").value;
		var primaryKey = key ? parseInt(key) : 0;
		if (primaryKey === 0) {
			store
			.add(object)
			.onsuccess = function (event) {
				showMessage('Added', true);
			};
		}
		else {
			store
			.put(object, primaryKey)
			.onsuccess = function (event) {
				showMessage('Updated', true);
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
	document.querySelector("#field-last").value = val(object.last);
	document.querySelector("#field-first").value = val(object.first);
	document.querySelector("#field-address1").value = val(object.address1);
	document.querySelector("#field-address2").value = val(object.address2);
	document.querySelector("#field-city").value = val(object.city);
	document.querySelector("#field-state").value = val(object.state);
	document.querySelector("#field-zip4").value = val(object.zip4);
	document.querySelector("#country").value = val(object.country);
	document.querySelector("#field-email1").value = val(object.email1);
	document.querySelector("#field-tele1").value = val(object.tele1);
	document.querySelector("#field-tele2").value = val(object.tele2);
	document.querySelector("#field-primaryKey").value = primaryKey;
}

function val(x) {
	return x ? x : "";
}
//end

function getForm() {
	return {
		last: document.querySelector("#field-last").value,
		first: document.querySelector("#field-first").value,
		address1: document.querySelector("#field-address1").value,
		address2: document.querySelector("#field-address2").value,
		city: document.querySelector("#field-city").value,
		state: document.querySelector("#field-state").value,
		zip4: document.querySelector("#field-zip4").value,
		country: document.querySelector("#country").value,
		email1: document.querySelector("#field-email1").value,
		tele1: document.querySelector("#field-tele1").value,
		tele2: document.querySelector("#field-tele2").value
	};
}

var timeoutID;

function showMessage(msg, good) {
	console.log(msg);
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
	showMessage('Error: ' + msg);
}


