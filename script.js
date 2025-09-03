// Top-level imports and Firebase initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5CsDh9NDb5qGcwiBQVg3fSEDaxlFiM74",
  authDomain: "messhallbooking.firebaseapp.com",
  databaseURL: "https://messhallbooking-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "messhallbooking",
  storageBucket: "messhallbooking.appspot.com",
  messagingSenderId: "948107559939",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 🧼 Helper: Sanitize key for Firebase
function sanitizeKey(name) {
  return name.replace(/[.#$[\]/]/g, "_");
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Starting script');

  const db = database;

  const leftSide = document.getElementById("leftSide");
  const rightSide = document.getElementById("rightSide");

  const bookingModal = document.getElementById("bookingModal");
  const modalTableNumber = document.getElementById("modalTableNumber");
  const bookingForm = document.getElementById("bookingForm");
  const nameSelect = document.getElementById("nameSelect");
  const peopleInput = document.getElementById("peopleInput");
  const errorMessage = document.getElementById("errorMessage");
  const cancelButton = document.getElementById("cancelButton");

  const manageNamesBtn = document.getElementById("manageNamesBtn");
  const manageNamesModal = document.getElementById("manageNamesModal");
  const namesList = document.getElementById("namesList");
  const newNameInput = document.getElementById("newNameInput");
  const addNameBtn = document.getElementById("addNameBtn");
  const saveNamesBtn = document.getElementById("saveNamesBtn");
  const cancelNamesBtn = document.getElementById("cancelNamesBtn");

  const exitNameSelect = document.getElementById("exitNameSelect");
  const exitButton = document.getElementById("exitButton");

  const clearAllBtn = document.getElementById("clearAllBtn");

  let selectedTableNumber = null;

  const autoBookingContainer = document.createElement('div');
  autoBookingContainer.style.margin = "20px 0";
  autoBookingContainer.style.textAlign = "center";

  const autoNameSelect = document.createElement('select');
  autoNameSelect.id = "autoNameSelect";
  autoNameSelect.style.marginRight = "10px";
  autoNameSelect.style.fontSize = "18px";
  autoNameSelect.style.padding = "8px 12px";
  autoNameSelect.style.minWidth = "180px";

  const autoPaxInput = document.createElement('input');
  autoPaxInput.type = "number";
  autoPaxInput.min = "1";
  autoPaxInput.placeholder = "Number of Pax";
  autoPaxInput.style.width = "150px";
  autoPaxInput.style.marginRight = "10px";
  autoPaxInput.style.fontSize = "18px";
  autoPaxInput.style.padding = "8px 12px";

  const autoBookBtn = document.createElement('button');
  autoBookBtn.textContent = "Auto Allocate Table(s)";
  autoBookBtn.style.padding = "12px 20px";
  autoBookBtn.style.fontSize = "18px";
  autoBookBtn.style.cursor = "pointer";

  autoBookingContainer.appendChild(autoNameSelect);
  autoBookingContainer.appendChild(autoPaxInput);
  autoBookingContainer.appendChild(autoBookBtn);

  document.body.insertBefore(autoBookingContainer, document.querySelector('.hall-layout'));

  const seatCapacity = {};
  for (let i = 1; i <= 28; i++) {
    seatCapacity[i] = [16, 17, 18].includes(i) ? 36 : 30;
  }

  const bookingsRef = ref(db, 'bookings');
  const seatsTakenRef = ref(db, 'seatsTaken');
  const presetNamesRef = ref(db, 'presetNames');

  let bookings = {};
  let seatsTaken = {};
  let presetNames = [];

  autoBookBtn.disabled = true;
  manageNamesBtn.disabled = true;
  clearAllBtn.disabled = true;

  Promise.all([get(bookingsRef), get(seatsTakenRef), get(presetNamesRef)])
    .then(([bookingsSnap, seatsTakenSnap, presetNamesSnap]) => {
      bookings = bookingsSnap.exists() ? bookingsSnap.val() : {};
      seatsTaken = seatsTakenSnap.exists() ? seatsTakenSnap.val() : {};
      presetNames = presetNamesSnap.exists() ? presetNamesSnap.val() : [];

      // Sanitize keys from database
      for (const table in bookings) {
        const newTable = {};
        for (const rawName in bookings[table]) {
          const safeKey = sanitizeKey(rawName);
          newTable[safeKey] = bookings[table][rawName];
        }
        bookings[table] = newTable;
      }

      for (let i = 1; i <= 28; i++) {
        if (!(i in seatsTaken)) seatsTaken[i] = 0;
        if (!(i in bookings)) bookings[i] = {};
      }

      populateNameSelect();
      populateAutoNameSelect();
      refreshTables();

      autoBookBtn.disabled = false;
      manageNamesBtn.disabled = false;
      clearAllBtn.disabled = false;
    })
    .catch(console.error);

  onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {};
    refreshTables();
    updateExitSelectOnBookingsChange();
  });

  onValue(seatsTakenRef, (snapshot) => {
    seatsTaken = snapshot.val() || {};
    refreshTables();
  });

  onValue(presetNamesRef, (snapshot) => {
    presetNames = snapshot.val() || [];
    populateNameSelect();
    populateAutoNameSelect();
  });

  function saveData() {
    set(bookingsRef, bookings).catch(console.error);
    set(seatsTakenRef, seatsTaken).catch(console.error);
    set(presetNamesRef, presetNames).catch(console.error);
  }

  function createColumn(tableNumbers) {
    const column = document.createElement("div");
    column.classList.add("table-column");

    for (const i of tableNumbers) {
      const totalSeats = seatCapacity[i];
      const taken = seatsTaken[i] ?? 0;
      const tableBookings = bookings[i] || {};

      const table = document.createElement("div");
      table.classList.add("table");

      if (taken === 0) {
        table.classList.add("available");
      } else if (taken >= totalSeats) {
        table.classList.add("full");
      } else {
        table.classList.add("partial");
      }

      let namesText = "";
      for (const [name, seats] of Object.entries(tableBookings)) {
        namesText += `${name} (${seats})\n`;
      }

      table.innerHTML = `Table ${i}<br />${taken}/${totalSeats}` +
        (namesText ? `<br /><small style="white-space: pre-wrap;">${namesText.trim()}</small>` : "");

      table.addEventListener("click", () => openBookingModal(i));

      column.appendChild(table);
    }

    return column;
  }

  function refreshTables() {
    leftSide.innerHTML = "";
    rightSide.innerHTML = "";

    leftSide.appendChild(createColumn([15, 16, 17, 18, 19, 20, 21, 22, 23]));
    leftSide.appendChild(createColumn([24, 25, 26, 27, 28]));

    rightSide.appendChild(createColumn([1, 2, 3, 4, 5, 6, 7]));
    rightSide.appendChild(createColumn([8, 9, 10, 11, 12, 13, 14]));
  }

  function populateNameSelect() {
    nameSelect.innerHTML = "";
    presetNames.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      nameSelect.appendChild(option);
    });
  }

  function populateAutoNameSelect() {
    autoNameSelect.innerHTML = "";
    presetNames.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      autoNameSelect.appendChild(option);
    });
  }

  // --- NEW FUNCTION ---
  // Populate exitNameSelect ONLY for the selected table bookings
  function populateExitNameSelect(tableNumber) {
    exitNameSelect.innerHTML = "";
    const names = Object.keys(bookings[tableNumber] || {});
    if (names.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No bookings";
      exitNameSelect.appendChild(option);
      exitNameSelect.disabled = true;
      exitButton.disabled = true;
    } else {
      names.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} (${bookings[tableNumber][name]} seats)`;
        exitNameSelect.appendChild(option);
      });
      exitNameSelect.disabled = false;
      exitButton.disabled = false;
    }
  }

  function openBookingModal(tableNumber) {
    selectedTableNumber = tableNumber;
    modalTableNumber.textContent = `Table ${tableNumber}`;
    errorMessage.textContent = "";
    peopleInput.value = "";

    // Show current bookings for this table only (optional display element)
    const tableBookings = bookings[tableNumber] || {};
    let bookingsText = "";

    for (const [name, seats] of Object.entries(tableBookings)) {
      bookingsText += `${name} (${seats})<br />`;
    }

    // Assuming you have an element with ID "currentBookings" inside the modal to show this info
    const currentBookingsDiv = document.getElementById("currentBookings");
    if (currentBookingsDiv) {
      currentBookingsDiv.innerHTML = bookingsText || "No current bookings.";
    }

    // Populate exitNameSelect dropdown for selected table only
    populateExitNameSelect(tableNumber);

    bookingModal.style.display = "block";
  }

  cancelButton.addEventListener("click", () => {
    bookingModal.style.display = "none";
  });

  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!selectedTableNumber) {
      alert("Please select a table first.");
      return;
    }

    const rawName = nameSelect.value.trim();
    const seats = parseInt(peopleInput.value);

    if (!rawName) {
      errorMessage.textContent = "Please select a name.";
      return;
    }

    if (isNaN(seats) || seats <= 0) {
      errorMessage.textContent = "Please enter a valid number of seats.";
      return;
    }

    const name = sanitizeKey(rawName);

    // Check capacity
    const capacity = seatCapacity[selectedTableNumber];
    const takenSeats = seatsTaken[selectedTableNumber] || 0;
    const currentSeatsForName = bookings[selectedTableNumber]?.[name] || 0;
    const newTotal = takenSeats - currentSeatsForName + seats;

    if (newTotal > capacity) {
      errorMessage.textContent = `Not enough seats available. (${capacity - takenSeats + currentSeatsForName} seats left)`;
      return;
    }

    // Update booking
    if (!bookings[selectedTableNumber]) bookings[selectedTableNumber] = {};
    bookings[selectedTableNumber][name] = seats;

    seatsTaken[selectedTableNumber] = newTotal;

    saveData();
    refreshTables();
    populateExitNameSelect(selectedTableNumber); // Update exit dropdown after booking

    bookingModal.style.display = "none";
  });

  // --- Updated exitButton listener ---
  exitButton.addEventListener("click", () => {
    const rawName = exitNameSelect.value.trim();
    const name = sanitizeKey(rawName);

    if (!name) {
      alert("Please select a name to exit.");
      return;
    }

    if (!selectedTableNumber) {
      alert("Please select a table first.");
      return;
    }

    const tableBookings = bookings[selectedTableNumber] || {};

    if (tableBookings[name]) {
      seatsTaken[selectedTableNumber] -= tableBookings[name];
      if (seatsTaken[selectedTableNumber] < 0) seatsTaken[selectedTableNumber] = 0;

      delete tableBookings[name];
      bookings[selectedTableNumber] = tableBookings;

      saveData();
      refreshTables();
      populateExitNameSelect(selectedTableNumber);

      alert(`${rawName} has exited and their booking on Table ${selectedTableNumber} is removed.`);
    } else {
      alert(`${rawName} has no booking on Table ${selectedTableNumber}.`);
    }
  });

  // --- Auto allocate function with updated logic ---
  autoBookBtn.addEventListener("click", () => {
    const rawName = autoNameSelect.value.trim();
    const squadSize = parseInt(autoPaxInput.value);

    if (!rawName) {
      alert("Please select a name.");
      return;
    }

    if (isNaN(squadSize) || squadSize <= 0) {
      alert("Please enter a valid number of pax.");
      return;
    }

    const name = sanitizeKey(rawName);

    autoAllocateTables(name, squadSize);
  });

  function autoAllocateTables(name, squadSize) {
    let remaining = squadSize;

    // Temporary local copies for logic before saving
    const tempBookings = JSON.parse(JSON.stringify(bookings));
    const tempSeatsTaken = {...seatsTaken};

    // Helper to assign seats to a table
    function assignSeats(table, seatsToAssign) {
      if (!tempBookings[table]) tempBookings[table] = {};
      tempBookings[table][name] = (tempBookings[table][name] || 0) + seatsToAssign;
      tempSeatsTaken[table] = (tempSeatsTaken[table] || 0) + seatsToAssign;
      remaining -= seatsToAssign;
    }

    // Step 1: For squads 31 or more — try large tables (16-18) first
    if (squadSize >= 31) {
      for (const table of [16, 17, 18]) {
        if (remaining <= 0) break;
        const capacity = seatCapacity[table];
        const taken = tempSeatsTaken[table] || 0;
        const freeSeats = capacity - taken;
        if (freeSeats > 0) {
          const seatsToAssign = Math.min(freeSeats, remaining);
          assignSeats(table, seatsToAssign);
        }
      }
    }

    // Step 2: For squads <= 30 — try to seat fully in a partially filled table,
    // but exclude tables 16-18 if they already have 31 or more pax
    if (squadSize <= 30 && remaining > 0) {
      // Find a partially filled table that can fit entire squad
      const partialFullFitTable = Object.keys(seatCapacity)
        .map(Number)
        .find(table => {
          const capacity = seatCapacity[table];
          const taken = tempSeatsTaken[table] || 0;
          const freeSeats = capacity - taken;

          // Exclude large tables (16-18) if already have 31 or more pax seated
          if ([16,17,18].includes(table) && taken >= 31) return false;

          return taken > 0 && freeSeats >= remaining;
        });

      if (partialFullFitTable) {
        assignSeats(partialFullFitTable, remaining);
      } else {
        // No partially filled table fits fully - try an empty table that fits whole squad
        const emptyFullFitTable = Object.keys(seatCapacity)
          .map(Number)
          .find(table => {
            const capacity = seatCapacity[table];
            const taken = tempSeatsTaken[table] || 0;
            return taken === 0 && capacity >= remaining;
          });
        if (emptyFullFitTable) {
          assignSeats(emptyFullFitTable, remaining);
        }
      }
    }

    // Step 3: If still remaining seats after above, try to partially fill other tables
    // (for any size squad)
    while (remaining > 0) {
      // Find partially filled tables with free seats
      const partialTables = Object.keys(seatCapacity)
        .map(Number)
        .filter(table => {
          const capacity = seatCapacity[table];
          const taken = tempSeatsTaken[table] || 0;
          const freeSeats = capacity - taken;

          // For squads <= 30, exclude partially filled large tables with 31+ pax
          if (squadSize <= 30 && [16,17,18].includes(table) && taken >= 31) return false;

          return taken > 0 && freeSeats > 0;
        });

      if (partialTables.length === 0) break;

      let seatedThisRound = false;

      for (const table of partialTables) {
        if (remaining <= 0) break;
        const capacity = seatCapacity[table];
        const taken = tempSeatsTaken[table] || 0;
        const freeSeats = capacity - taken;

        const seatsToAssign = Math.min(freeSeats, remaining);

        // For squads <= 30, only seat in one partially filled table fully (Step 2),
        // here split allowed only if squad > 30 or no other choice
        if (squadSize <= 30 && seatsToAssign < remaining) {
          // Skip this table - because we do NOT want to split small squads across multiple tables
          continue;
        }

        assignSeats(table, seatsToAssign);
        seatedThisRound = true;
      }

      if (!seatedThisRound) break; // No further seating possible here
    }

    // Step 4: If still remaining, try to seat on empty tables (for any size)
    while (remaining > 0) {
      const emptyTables = Object.keys(seatCapacity)
        .map(Number)
        .filter(table => {
          const taken = tempSeatsTaken[table] || 0;
          return taken === 0;
        });

      if (emptyTables.length === 0) break;

      const table = emptyTables[0];
      const capacity = seatCapacity[table];
      const seatsToAssign = Math.min(capacity, remaining);

      assignSeats(table, seatsToAssign);
    }

    if (remaining > 0) {
      alert(`Not enough seats available to accommodate all ${squadSize} pax.`);
      return;
    }

    // Commit changes
    bookings = tempBookings;
    seatsTaken = tempSeatsTaken;
    saveData();
    refreshTables();

    alert(`Successfully seated ${squadSize} pax for ${name}.`);
  }

  // Manage Names Modal Logic
  manageNamesBtn.addEventListener("click", () => {
    namesList.innerHTML = "";
    presetNames.forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.style.marginLeft = "10px";
      removeBtn.addEventListener("click", () => {
        const idx = presetNames.indexOf(name);
        if (idx > -1) {
          presetNames.splice(idx, 1);
          namesList.removeChild(li);
          populateNameSelect();
          populateAutoNameSelect();
        }
      });

      li.appendChild(removeBtn);
      namesList.appendChild(li);
    });

    manageNamesModal.style.display = "block";
  });

  addNameBtn.addEventListener("click", () => {
    const newName = newNameInput.value.trim();
    if (newName && !presetNames.includes(newName)) {
      presetNames.push(newName);
      newNameInput.value = "";
      const li = document.createElement("li");
      li.textContent = newName;

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.style.marginLeft = "10px";
      removeBtn.addEventListener("click", () => {
        const idx = presetNames.indexOf(newName);
        if (idx > -1) {
          presetNames.splice(idx, 1);
          namesList.removeChild(li);
          populateNameSelect();
          populateAutoNameSelect();
        }
      });

      li.appendChild(removeBtn);
      namesList.appendChild(li);
      populateNameSelect();
      populateAutoNameSelect();
    }
  });

  saveNamesBtn.addEventListener("click", () => {
    saveData();
    manageNamesModal.style.display = "none";
  });

  cancelNamesBtn.addEventListener("click", () => {
    manageNamesModal.style.display = "none";
  });

  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all bookings?")) {
      bookings = {};
      seatsTaken = {};
      for (let i = 1; i <= 28; i++) {
        bookings[i] = {};
        seatsTaken[i] = 0;
      }
      saveData();
      refreshTables();
      alert("All bookings cleared.");
    }
  });

  function updateExitSelectOnBookingsChange() {
    // If a table is selected, update exitNameSelect for that table
    if (selectedTableNumber) {
      populateExitNameSelect(selectedTableNumber);
    }
  }
});
