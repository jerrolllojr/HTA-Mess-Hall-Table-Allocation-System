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
  const db = window.database;
  const bookingsRef = firebase.database().ref('bookings');
  const seatsTakenRef = firebase.database().ref('seatsTaken');
  const presetNamesRef = firebase.database().ref('presetNames');

  // Initialize data containers
  let bookings = {};
  let seatsTaken = {};
  let presetNames = [];

  // Initialize UI disabled until data loads
  autoBookBtn.disabled = true;
  manageNamesBtn.disabled = true;
  clearAllBtn.disabled = true;

  // Fetch initial data from Firebase and set up listeners
  Promise.all([
    bookingsRef.once('value'),
    seatsTakenRef.once('value'),
    presetNamesRef.once('value')
  ]).then(([bookingsSnap, seatsTakenSnap, presetNamesSnap]) => {
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
  bookingsRef.on('value', snapshot => {
    bookings = snapshot.val() || {};
    refreshTables();
  });

  seatsTakenRef.on('value', snapshot => {
    seatsTaken = snapshot.val() || {};
    refreshTables();
  });

  presetNamesRef.on('value', snapshot => {
    presetNames = snapshot.val() || [];
    populateNameSelect();
    populateAutoNameSelect();
  });

  function saveData() {
    bookingsRef.set(bookings).catch(console.error);
    seatsTakenRef.set(seatsTaken).catch(console.error);
    presetNamesRef.set(presetNames).catch(console.error);
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
    modalTableNumber.textContent = tableNumber;
    peopleInput.value = "";
    errorMessage.textContent = "";
    populateNameSelect();
    populateExitNameSelect(tableNumber);
    bookingModal.classList.remove("hidden");
    nameSelect.focus();
  }

  function closeBookingModal() {
    bookingModal.classList.add("hidden");
    selectedTableNumber = null;
  }

  bookingForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!selectedTableNumber) return;

    const name = nameSelect.value.trim();
    const people = parseInt(peopleInput.value);

    if (!name) {
      errorMessage.textContent = "Please select a name.";
      return;
    }
    if (isNaN(people) || people < 1) {
      errorMessage.textContent = "Please enter a valid number of people.";
      return;
    }

    const totalSeats = seatCapacity[selectedTableNumber];
    const currentTaken = seatsTaken[selectedTableNumber] || 0;
    const currentBookingSeats = bookings[selectedTableNumber]?.[name] || 0;
    const availableSeats = totalSeats - currentTaken + currentBookingSeats;

    if (people > availableSeats) {
      errorMessage.textContent = `Not enough seats available. Max: ${availableSeats}`;
      return;
    }

    // Update bookings and seatsTaken
    if (!bookings[selectedTableNumber]) bookings[selectedTableNumber] = {};
    bookings[selectedTableNumber][name] = people;

    seatsTaken[selectedTableNumber] = totalSeats; // recalc to be safe
    // recalc seatsTaken for table:
    let sum = 0;
    for (const seats of Object.values(bookings[selectedTableNumber])) {
      sum += seats;
    }
    seatsTaken[selectedTableNumber] = sum;

    saveData();
    refreshTables();
    closeBookingModal();
  });

  cancelButton.addEventListener("click", e => {
    e.preventDefault();
    closeBookingModal();
  });

  // Manage Names Modal
  manageNamesBtn.addEventListener("click", () => {
    manageNamesModal.classList.remove("hidden");
    renderNamesList();
  });

  cancelNamesBtn.addEventListener("click", () => {
    manageNamesModal.classList.add("hidden");
  });

  addNameBtn.addEventListener("click", () => {
    const newName = newNameInput.value.trim();
    if (newName && !presetNames.includes(newName)) {
      presetNames.push(newName);
      newNameInput.value = "";
      renderNamesList();
    }
  });

  saveNamesBtn.addEventListener("click", () => {
    presetNames = Array.from(new Set(presetNames.map(name => name.trim()))).filter(Boolean);
    saveData();
    populateNameSelect();
    populateAutoNameSelect();
    manageNamesModal.classList.add("hidden");
  });

  function renderNamesList() {
    namesList.innerHTML = "";
    presetNames.forEach((name, idx) => {
      const li = document.createElement("li");
      li.textContent = name + " ";
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.addEventListener("click", () => {
        presetNames.splice(idx, 1);
        renderNamesList();
      });
      li.appendChild(deleteBtn);
      namesList.appendChild(li);
    });
  }

  // Exit booking from table
  exitButton.addEventListener("click", () => {
    if (!selectedTableNumber) return;

    const nameToRemove = exitNameSelect.value;
    if (!nameToRemove || !(bookings[selectedTableNumber]?.[nameToRemove])) return;

    delete bookings[selectedTableNumber][nameToRemove];

    // Recalculate seatsTaken
    let sum = 0;
    for (const seats of Object.values(bookings[selectedTableNumber])) {
      sum += seats;
    }
    seatsTaken[selectedTableNumber] = sum;

    saveData();
    refreshTables();
    closeBookingModal();
  });

  // Clear All Bookings
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
    }
  });

  // Auto Booking Logic
  autoBookBtn.addEventListener("click", () => {
    const name = autoNameSelect.value.trim();
    const pax = parseInt(autoPaxInput.value);

    if (!name) {
      alert("Please select a name for auto booking.");
      return;
    }
    if (isNaN(pax) || pax < 1) {
      alert("Please enter a valid number of pax.");
      return;
    }

    const tablesToBook = [];
    let paxLeft = pax;

    // Sort tables by available seats descending
    const tables = Object.keys(seatCapacity).map(Number).sort((a, b) => {
      const availableA = seatCapacity[a] - (seatsTaken[a] || 0);
      const availableB = seatCapacity[b] - (seatsTaken[b] || 0);
      return availableB - availableA;
    });

    for (const table of tables) {
      const availableSeats = seatCapacity[table] - (seatsTaken[table] || 0);
      if (availableSeats <= 0) continue;

      const seatsToBook = Math.min(availableSeats, paxLeft);

      if (!bookings[table]) bookings[table] = {};
      bookings[table][name] = (bookings[table][name] || 0) + seatsToBook;

      seatsTaken[table] = (seatsTaken[table] || 0) + seatsToBook;

      paxLeft -= seatsToBook;
      tablesToBook.push(table);

      if (paxLeft <= 0) break;
    }

    if (paxLeft > 0) {
      alert(`Not enough seats available to book ${pax} seats for ${name}. Only booked ${pax - paxLeft}.`);
    } else {
      alert(`Successfully booked ${pax} seats for ${name} across tables: ${tablesToBook.join(', ')}`);
    }

    saveData();
    refreshTables();
  });
});
