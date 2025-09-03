console.log('DOM loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Starting script');


// Import required Firebase functions for Realtime Database
import { ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
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

  // --- AUTO BOOK UI Elements ---
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

  // Seat capacity by table
  const seatCapacity = {};
  for (let i = 1; i <= 28; i++) {
    seatCapacity[i] = [16, 17, 18].includes(i) ? 36 : 30;
  }

  // Firebase Realtime Database references
  const db = window.database; // from your firebase initialization in HTML
  const bookingsRef = ref(db, 'bookings');
  const seatsTakenRef = ref(db, 'seatsTaken');
  const presetNamesRef = ref(db, 'presetNames');

  // Initialize data containers
  let bookings = {};
  let seatsTaken = {};
  let presetNames = [];

  // Initialize UI disabled until data loads
  autoBookBtn.disabled = true;
  manageNamesBtn.disabled = true;
  clearAllBtn.disabled = true;

  // Fetch initial data from Firebase and set up listeners
  Promise.all([get(bookingsRef), get(seatsTakenRef), get(presetNamesRef)])
    .then(([bookingsSnap, seatsTakenSnap, presetNamesSnap]) => {
      bookings = bookingsSnap.exists() ? bookingsSnap.val() : {};
      seatsTaken = seatsTakenSnap.exists() ? seatsTakenSnap.val() : {};
      presetNames = presetNamesSnap.exists() ? presetNamesSnap.val() : [
        "CC4/25", "C5/24", "C1/25", "C2/25", "C3/25", "C4/25", "C5/25", "C6/25", "C7/25", "C8/25",
        "R2/25", "R3/25", "R4/25", "R5/25", "R6/25", "R7/25", "R8/25", "R9/25", "R10/25",
        "NS26", "NS27", "NS28", "NS29", "NS30", "NS31", "NS32", "NS33", "NS34", "NS35",
        "NS36", "NS37", "NS38", "NS39", "NS40", "NS41", "NS42", "NS43", "NS44", "NS45",
        "NS46", "NS47", "NS48", "NS49", "NS50",
        "OCT/01", "OCT/02", "OCT/03", "OCT/04", "SPTI-02", "SPTI-03", "ICA INSP 03/25", "ICA INSP 04/25",
        "ICA INSP 05/25", "ICA INSP 06/25", "ICA INSP 07/25", "ICA SGT 03/25", "ICA SGT 04/25", "ICA SGT 05/25", "ICA SGT 06/25", "ICA Alpha", "ICA Bravo", "ICA Charlie"
      ];

      // Initialize empty bookings and seatsTaken if missing
      for (let i = 1; i <= 28; i++) {
        if (!(i in seatsTaken)) seatsTaken[i] = 0;
        if (!(i in bookings)) bookings[i] = {};
      }

      populateNameSelect();
      populateAutoNameSelect();
      refreshTables();

      // Enable UI after loading data
      autoBookBtn.disabled = false;
      manageNamesBtn.disabled = false;
      clearAllBtn.disabled = false;
    }).catch(console.error);

  // Listen for realtime updates from Firebase
  onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {};
    refreshTables();
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

  function openBookingModal(tableNumber) {
    selectedTableNumber = tableNumber;
    modalTableNumber.textContent = `Table ${tableNumber}`;
    errorMessage.textContent = "";
    peopleInput.value = "";
    bookingModal.style.display = "block";
  }

  cancelButton.addEventListener("click", () => {
    bookingModal.style.display = "none";
  });

  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameSelect.value.trim();
    const people = parseInt(peopleInput.value);

    if (!name) {
      errorMessage.textContent = "Please select a name.";
      return;
    }

    if (!people || people < 1) {
      errorMessage.textContent = "Please enter a valid number of people.";
      return;
    }

    const tableCapacity = seatCapacity[selectedTableNumber];
    const currentTaken = seatsTaken[selectedTableNumber] ?? 0;

    if (currentTaken + people > tableCapacity) {
      errorMessage.textContent = "Not enough seats available at this table.";
      return;
    }

    // Update bookings and seatsTaken
    if (!bookings[selectedTableNumber]) {
      bookings[selectedTableNumber] = {};
    }

    if (bookings[selectedTableNumber][name]) {
      bookings[selectedTableNumber][name] += people;
    } else {
      bookings[selectedTableNumber][name] = people;
    }

    seatsTaken[selectedTableNumber] = currentTaken + people;

    saveData();

    bookingModal.style.display = "none";
    refreshTables();
  });

  // Manage Names Modal Logic
  manageNamesBtn.addEventListener("click", () => {
    manageNamesModal.style.display = "block";
    renderNamesList();
    newNameInput.value = "";
  });

  cancelNamesBtn.addEventListener("click", () => {
    manageNamesModal.style.display = "none";
  });

  addNameBtn.addEventListener("click", () => {
    const newName = newNameInput.value.trim();
    if (newName && !presetNames.includes(newName)) {
      presetNames.push(newName);
      newNameInput.value = "";
      renderNamesList();
      populateNameSelect();
      populateAutoNameSelect();
    }
  });

  saveNamesBtn.addEventListener("click", () => {
    saveData();
    manageNamesModal.style.display = "none";
  });

  function renderNamesList() {
    namesList.innerHTML = "";
    presetNames.forEach((name, idx) => {
      const li = document.createElement("li");
      li.textContent = name;
      li.style.cursor = "pointer";
      li.title = "Click to remove";

      li.addEventListener("click", () => {
        if (confirm(`Remove "${name}" from the list?`)) {
          presetNames.splice(idx, 1);
          renderNamesList();
          populateNameSelect();
          populateAutoNameSelect();
        }
      });

      namesList.appendChild(li);
    });
  }

  // Exit Table Booking Logic
  exitButton.addEventListener("click", () => {
    const name = exitNameSelect.value.trim();
    if (!name) {
      alert("Please select a name to exit.");
      return;
    }

    let found = false;
    for (const [table, names] of Object.entries(bookings)) {
      if (names[name]) {
        const seats = names[name];
        delete bookings[table][name];
        seatsTaken[table] -= seats;
        if (seatsTaken[table] < 0) seatsTaken[table] = 0;
        found = true;
        break;
      }
    }

    if (!found) {
      alert(`${name} is not currently booked at any table.`);
      return;
    }

    saveData();
    refreshTables();
    alert(`${name} has been exited from their booking.`);
  });

  // Populate exitNameSelect
  function populateExitNameSelect() {
    const uniqueNames = new Set();
    for (const names of Object.values(bookings)) {
      for (const name of Object.keys(names)) {
        uniqueNames.add(name);
      }
    }

    exitNameSelect.innerHTML = "";
    if (uniqueNames.size === 0) {
      const option = document.createElement('option');
      option.textContent = 'No bookings found';
      option.value = '';
      exitNameSelect.appendChild(option);
    } else {
      uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        exitNameSelect.appendChild(option);
      });
    }
  }

  // Update exitNameSelect whenever bookings change
  function updateExitSelectOnBookingsChange() {
    populateExitNameSelect();
  }

  // Call once initially after data load
  updateExitSelectOnBookingsChange();

  // Listen to bookings change to update exit list
  onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {};
    refreshTables();
    updateExitSelectOnBookingsChange();
  });

  // Clear All Bookings Logic
  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all bookings?")) {
      bookings = {};
      seatsTaken = {};
      for (let i = 1; i <= 28; i++) {
        seatsTaken[i] = 0;
      }
      saveData();
      refreshTables();
      updateExitSelectOnBookingsChange();
    }
  });

  // Auto Book Logic
  autoBookBtn.addEventListener("click", () => {
    const name = autoNameSelect.value.trim();
    const pax = parseInt(autoPaxInput.value);

    if (!name) {
      alert("Please select a name.");
      return;
    }
    if (!pax || pax < 1) {
      alert("Please enter a valid number of pax.");
      return;
    }

    // Try to allocate tables automatically
    // Strategy: find tables with available seats, fill in order until pax is satisfied

    let remainingPax = pax;
    let allocation = [];

    // Tables sorted by available seats descending
    const tablesByAvailability = Object.keys(seatCapacity).map(t => {
      const tNum = parseInt(t);
      const capacity = seatCapacity[tNum];
      const taken = seatsTaken[tNum] || 0;
      return {
        table: tNum,
        available: capacity - taken
      };
    }).filter(t => t.available > 0)
      .sort((a, b) => b.available - a.available);

    for (const t of tablesByAvailability) {
      if (remainingPax <= 0) break;
      const seatsToBook = Math.min(remainingPax, t.available);
      allocation.push({ table: t.table, seats: seatsToBook });
      remainingPax -= seatsToBook;
    }

    if (remainingPax > 0) {
      alert(`Not enough seats available to accommodate ${pax} pax.`);
      return;
    }

    // Apply allocation to bookings and seatsTaken
    for (const { table, seats } of allocation) {
      if (!bookings[table]) bookings[table] = {};
      if (bookings[table][name]) {
        bookings[table][name] += seats;
      } else {
        bookings[table][name] = seats;
      }
      seatsTaken[table] = (seatsTaken[table] || 0) + seats;
    }

    saveData();
    refreshTables();
    alert(`Successfully allocated ${pax} seats for ${name}.`);
    autoPaxInput.value = "";
  });

  // Close modals when clicking outside modal content
  window.addEventListener("click", (e) => {
    if (e.target === bookingModal) {
      bookingModal.style.display = "none";
    }
    if (e.target === manageNamesModal) {
      manageNamesModal.style.display = "none";
    }
  });
});


