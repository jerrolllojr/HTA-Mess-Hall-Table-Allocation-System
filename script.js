console.log('JS loaded')

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
  // We'll replace the exit button below to clear old handlers
  const oldExitButton = document.getElementById("exitButton");

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
  if (i === 18) {
    seatCapacity[i] = 42;
  } else if ([15, 16, 17].includes(i)) {
    seatCapacity[i] = 36;
  } else {
    seatCapacity[i] = 30;
  }
}

  const ZONES = {
  left: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
  right: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
};

function getZone(tableNumber) {
  if (ZONES.left.includes(parseInt(tableNumber))) return 'left';
  if (ZONES.right.includes(parseInt(tableNumber))) return 'right';
  return null;
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
      updateSquadsPresent();

      autoBookBtn.disabled = false;
      manageNamesBtn.disabled = false;
      clearAllBtn.disabled = false;
    })
    .catch(console.error);

  onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {};
    refreshTables();
    updateExitSelectOnBookingsChange();
    updateSquadsPresent();
    
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

  function updateSquadsPresent() {
  const squadsPresentDiv = document.getElementById('squadsPresent');
  
  // Get squads from a separate Firebase reference
  const squadsPresentRef = ref(db, 'squadsPresent');
  get(squadsPresentRef).then((snapshot) => {
    const squadsPresent = snapshot.exists() ? snapshot.val() : [];
    
    if (squadsPresent.length === 0) {
      squadsPresentDiv.textContent = "No squads present";
    } else {
      squadsPresentDiv.textContent = squadsPresent.sort().join(', ');
    }
  });
}

function addSquadToPresent(squadName) {
  const squadsPresentRef = ref(db, 'squadsPresent');
  get(squadsPresentRef).then((snapshot) => {
    const squadsPresent = snapshot.exists() ? snapshot.val() : [];
    
    if (!squadsPresent.includes(squadName)) {
      squadsPresent.push(squadName);
      set(squadsPresentRef, squadsPresent);
      updateSquadsPresent();
    }
  });
}

function clearSquadsPresent() {
  const squadsPresentRef = ref(db, 'squadsPresent');
  set(squadsPresentRef, []);
  updateSquadsPresent();
}
  
  function populateNameSelect() {
    nameSelect.innerHTML = "";

    // Sort the preset names alphabetically before adding them
  presetNames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    
    presetNames.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        nameSelect.appendChild(option);
    });
}


  function populateAutoNameSelect() {
    autoNameSelect.innerHTML = "";

    // Sort the preset names alphabetically before adding them
presetNames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    
    presetNames.forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        autoNameSelect.appendChild(option);
    });
}


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
    modalTableNumber.textContent = tableNumber;
    errorMessage.textContent = "";
    peopleInput.value = "";

    // Show current bookings for this table only (optional display element)
    const tableBookings = bookings[tableNumber] || {};
    let bookingsText = "";

    for (const [name, seats] of Object.entries(tableBookings)) {
      bookingsText += `${name}: ${seats} seats\n`;
    }

    populateExitNameSelect(tableNumber);

    bookingModal.style.display = "block";
  }

  cancelButton.addEventListener("click", () => {
    bookingModal.style.display = "none";
  });

  // EXIT BUTTON: Replace old exit button to remove any previous listeners
  const exitButton = oldExitButton.cloneNode(true);
  oldExitButton.parentNode.replaceChild(exitButton, oldExitButton);

  exitButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

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
      updateSquadsPresent();

      alert(`${rawName} has exited and their booking on Table ${selectedTableNumber} is removed.`);
    } else {
      alert(`${rawName} has no booking on Table ${selectedTableNumber}.`);
    }
  });

  // MANUAL BOOKING FORM SUBMIT
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

    const capacity = seatCapacity[selectedTableNumber];
    const takenSeats = seatsTaken[selectedTableNumber] || 0;
    const currentSeatsForName = bookings[selectedTableNumber]?.[name] || 0;
    const newTotal = takenSeats - currentSeatsForName + seats;

    if (newTotal > capacity) {
      errorMessage.textContent = `Not enough seats available. (${capacity - takenSeats + currentSeatsForName} seats left)`;
      return;
    }

    if (!bookings[selectedTableNumber]) bookings[selectedTableNumber] = {};
    bookings[selectedTableNumber][name] = seats;

    seatsTaken[selectedTableNumber] = newTotal;

    saveData();
    refreshTables();
    populateExitNameSelect(selectedTableNumber);
    updateSquadsPresent();
    addSquadToPresent(rawName);

    bookingModal.style.display = "none";
  });

  function autoAllocateTable(name, pax, preferredZone = null) {
  const safeName = sanitizeKey(name);

  // Clear previous booking for this name
  for (const tableNum in bookings) {
    if (bookings[tableNum][safeName]) {
      seatsTaken[tableNum] -= bookings[tableNum][safeName];
      delete bookings[tableNum][safeName];
    }
  }

  // Determine which zones to try
  let zonesToTry = [];
  if (preferredZone && ZONES[preferredZone]) {
    zonesToTry = [preferredZone];
  } else {
    zonesToTry = ['left', 'right'];
  }

  // Try each zone separately - no cross-zone allocation
  for (const zone of zonesToTry) {
    const tablesByCapacity = ZONES[zone];
    let assignedTables = [];
    let remainingPax = pax;

   // === Big group logic (pax > 30) within this zone
if (pax > 30) {
  // Step 1: Prioritize tables 15-18 for groups of 31-42 pax
  if (pax >= 31 && pax <= 42) {
    const priorityTables = [15, 16, 17, 18].filter(t => tablesByCapacity.includes(t));
    
    for (const t of priorityTables) {
      const capacity = seatCapacity[t]; // Should be 36 for tables 15,16,17 and 42 for table 18
      const taken = seatsTaken[t] || 0;
      if (taken === 0 && capacity >= pax) {
        if (!bookings[t]) bookings[t] = {};
        bookings[t][safeName] = pax;
        seatsTaken[t] = pax;
        assignedTables.push(t);
        saveData();
        refreshTables();
        addSquadToPresent(name);
        return assignedTables;
      }
    }
  }

      // Step 2: For groups > 36 pax, use smart allocation (empty table + spill)
      if (pax > 36) {
        // Get empty tables in this zone, prioritizing 36-seat tables
        const emptyTables36 = tablesByCapacity.filter(t => {
          const capacity = seatCapacity[t];
          const taken = seatsTaken[t] || 0;
          return taken === 0 && capacity === 36;
        });
        
        const emptyTables30 = tablesByCapacity.filter(t => {
          const capacity = seatCapacity[t];
          const taken = seatsTaken[t] || 0;
          return taken === 0 && capacity === 30;
        });
        
        // Try 36-seat tables first, then 30-seat tables
        for (const primaryTable of [...emptyTables36, ...emptyTables30]) {
          const primaryCapacity = seatCapacity[primaryTable];
          const spillPax = pax - primaryCapacity;
          
          // Find a table for the spill - prefer partially filled tables first
          let spillTable = null;
          
          // First try partially filled tables with enough space
          for (const t of tablesByCapacity) {
            if (t === primaryTable) continue;
            const capacity = seatCapacity[t];
            const taken = seatsTaken[t] || 0;
            const available = capacity - taken;
            
            if (taken > 0 && available >= spillPax) {
              spillTable = t;
              break;
            }
          }
          
          // If no partially filled table, try empty tables
          if (!spillTable) {
            for (const t of tablesByCapacity) {
              if (t === primaryTable) continue;
              const capacity = seatCapacity[t];
              const taken = seatsTaken[t] || 0;
              
              if (taken === 0 && capacity >= spillPax) {
                spillTable = t;
                break;
              }
            }
          }
          
          // If we found both tables, allocate
          if (spillTable) {
            // Assign to primary table
            if (!bookings[primaryTable]) bookings[primaryTable] = {};
            bookings[primaryTable][safeName] = primaryCapacity;
            seatsTaken[primaryTable] = primaryCapacity;
            assignedTables.push(primaryTable);
            
            // Assign spill to second table
            if (!bookings[spillTable]) bookings[spillTable] = {};
            const currentTaken = seatsTaken[spillTable] || 0;
            bookings[spillTable][safeName] = spillPax;
            seatsTaken[spillTable] = currentTaken + spillPax;
            assignedTables.push(spillTable);
            
            saveData();
            refreshTables();
            addSquadToPresent(name);
            return assignedTables;
          }
        }
      }

      // Step 3: Try one empty table with capacity >= pax (fallback for <= 36 pax or when Step 2 fails)
      for (const t of tablesByCapacity) {
        const capacity = seatCapacity[t];
        const taken = seatsTaken[t] || 0;
        if (taken === 0 && capacity >= pax) {
          if (!bookings[t]) bookings[t] = {};
          bookings[t][safeName] = pax;
          seatsTaken[t] = pax;
          assignedTables.push(t);
          saveData();
          refreshTables();
          addSquadToPresent(name);
          return assignedTables;
        }
      }

      // Step 4: Try combining one empty + one partially filled within zone
      let bestEmptyTable = null;
      let bestPartialTable = null;
      let bestEmptyCapacity = 0;
      let bestPartialAvailable = 0;

      // Find the best empty table (largest capacity)
      for (const t of tablesByCapacity) {
        const capacity = seatCapacity[t];
        const taken = seatsTaken[t] || 0;
        if (taken === 0 && capacity > bestEmptyCapacity) {
          bestEmptyTable = t;
          bestEmptyCapacity = capacity;
        }
      }

      // Find the best partially filled table (most available seats)
      for (const t of tablesByCapacity) {
        const capacity = seatCapacity[t];
        const taken = seatsTaken[t] || 0;
        const available = capacity - taken;
        if (taken > 0 && available > 0 && available > bestPartialAvailable) {
          bestPartialTable = t;
          bestPartialAvailable = available;
        }
      }

      // Check if we can accommodate with empty + partial combination
      if (bestEmptyTable && bestPartialTable && (bestEmptyCapacity + bestPartialAvailable >= pax)) {
        // Prioritize filling the empty table first, then use partial
        const assignToEmpty = Math.min(pax, bestEmptyCapacity);
        const assignToPartial = pax - assignToEmpty;

        // Assign to empty table
        if (!bookings[bestEmptyTable]) bookings[bestEmptyTable] = {};
        bookings[bestEmptyTable][safeName] = assignToEmpty;
        seatsTaken[bestEmptyTable] = assignToEmpty;
        assignedTables.push(bestEmptyTable);

        // Assign remaining to partial table
        if (assignToPartial > 0) {
          if (!bookings[bestPartialTable]) bookings[bestPartialTable] = {};
          bookings[bestPartialTable][safeName] = assignToPartial;
          seatsTaken[bestPartialTable] += assignToPartial;
          assignedTables.push(bestPartialTable);
        }

        saveData();
        refreshTables();
        addSquadToPresent(name);
        return assignedTables;
      }

      // Step 5: Multi-table allocation with 3-table limit
      // Check if this zone has enough total capacity
      let totalAvailable = 0;
      for (const t of tablesByCapacity) {
        const capacity = seatCapacity[t];
        const taken = seatsTaken[t] || 0;
        totalAvailable += (capacity - taken);
      }

      // Only proceed with multi-table allocation if zone has enough capacity
      if (totalAvailable >= pax) {
        assignedTables = [];
        remainingPax = pax;

        // Get available tables sorted by preference
        const emptyTables = [];
        const partialTables = [];
        
        for (const t of tablesByCapacity) {
          const capacity = seatCapacity[t];
          const taken = seatsTaken[t] || 0;
          if (taken === 0) {
            emptyTables.push({table: t, capacity, available: capacity});
          } else if (taken > 0 && (capacity - taken) > 0) {
            partialTables.push({table: t, capacity, available: capacity - taken});
          }
        }

        // Sort empty tables by capacity (largest first)
        emptyTables.sort((a, b) => b.capacity - a.capacity);
        // Sort partial tables by available space (largest first)
        partialTables.sort((a, b) => b.available - a.available);

        // Combine all available tables, prioritizing empty tables
        const allAvailableTables = [...emptyTables, ...partialTables];

        // Try to fit within 3 tables maximum
        let tablesUsed = 0;
        const maxTables = 3;

        for (const {table: t, available} of allAvailableTables) {
          if (remainingPax === 0 || tablesUsed >= maxTables) break;
          
          const toAssign = Math.min(remainingPax, available);
          if (!bookings[t]) bookings[t] = {};
          
          // Check if this is an empty table or partial table
          const currentTaken = seatsTaken[t] || 0;
          
          bookings[t][safeName] = toAssign;
          seatsTaken[t] = currentTaken + toAssign;
          assignedTables.push(t);
          remainingPax -= toAssign;
          tablesUsed++;
        }

        // Check if we successfully allocated all pax within the table limit
        if (remainingPax === 0) {
          saveData();
          refreshTables();
          addSquadToPresent(name);
          return assignedTables;
        } else {
          // If we couldn't fit within 3 tables, check if it's theoretically possible
          // Calculate maximum capacity of best 3 tables
          let maxCapacityWith3Tables = 0;
          for (let i = 0; i < Math.min(3, allAvailableTables.length); i++) {
            maxCapacityWith3Tables += allAvailableTables[i].available;
          }
          
          if (pax > maxCapacityWith3Tables) {
            // Cannot fit even with best 3 tables - reject allocation
            continue; // Try next zone
          }
        }
      }
    }
      
    // === Small group logic (pax < 30) within this zone - no changes needed as they typically use 1-2 tables
    else {
      // Step 1: Try partially filled table with enough space
      for (const t of tablesByCapacity) {
        const capacity = seatCapacity[t];
        const taken = seatsTaken[t] || 0;
        const available = capacity - taken;

        if (taken > 0 && available >= pax) {
          if (!bookings[t]) bookings[t] = {};
          bookings[t][safeName] = pax;
          seatsTaken[t] = taken + pax;
          assignedTables.push(t);
          saveData();
          refreshTables();
          addSquadToPresent(name);
          return assignedTables;
        }
      }

    // Step 2: Try empty table with enough capacity (prefer smaller tables first)
const emptyTablesWithCapacity = [];
for (const t of tablesByCapacity) {
  const capacity = seatCapacity[t];
  const taken = seatsTaken[t] || 0;
  if (taken === 0 && capacity >= pax) {
    emptyTablesWithCapacity.push({table: t, capacity});
  }
}

// Sort by capacity ascending (smallest suitable table first)
emptyTablesWithCapacity.sort((a, b) => a.capacity - b.capacity);

if (emptyTablesWithCapacity.length > 0) {
  const t = emptyTablesWithCapacity[0].table;
  if (!bookings[t]) bookings[t] = {};
  bookings[t][safeName] = pax;
  seatsTaken[t] = pax;
  assignedTables.push(t);
  saveData();
  refreshTables();
  addSquadToPresent(name);
  return assignedTables;
}
      
      // Step 3: Multi-table allocation for small groups (limited to 3 tables)
      let totalAvailable = 0;
      for (const t of tablesByCapacity) {
        const capacity = seatCapacity[t];
        const taken = seatsTaken[t] || 0;
        totalAvailable += (capacity - taken);
      }

      if (totalAvailable >= pax) {
        assignedTables = [];
        remainingPax = pax;

        // Get available tables
        const availableTables = [];
        for (const t of tablesByCapacity) {
          const capacity = seatCapacity[t];
          const taken = seatsTaken[t] || 0;
          const available = capacity - taken;
          if (available > 0) {
            availableTables.push({
              table: t, 
              available, 
              isEmpty: taken === 0
            });
          }
        }

        // Sort: empty tables first (by capacity desc), then partial tables (by available desc)
        availableTables.sort((a, b) => {
          if (a.isEmpty && !b.isEmpty) return -1;
          if (!a.isEmpty && b.isEmpty) return 1;
          return b.available - a.available;
        });

        // Allocate with 3-table limit
        let tablesUsed = 0;
        const maxTables = 3;

        for (const {table: t, available} of availableTables) {
          if (remainingPax === 0 || tablesUsed >= maxTables) break;
          
          const toAssign = Math.min(remainingPax, available);
          const currentTaken = seatsTaken[t] || 0;
          
          if (!bookings[t]) bookings[t] = {};
          bookings[t][safeName] = toAssign;
          seatsTaken[t] = currentTaken + toAssign;
          assignedTables.push(t);
          remainingPax -= toAssign;
          tablesUsed++;
        }

        // If successfully allocated all pax within this zone and table limit
        if (remainingPax === 0) {
          saveData();
          refreshTables();
          addSquadToPresent(name);
          return assignedTables;
        }
      }
    }
  }

  // If we reach here, no zone could accommodate the booking within the 3-table limit
  return [];
}
  
  
  autoBookBtn.addEventListener("click", () => {
    const rawName = autoNameSelect.value.trim();
    const pax = parseInt(autoPaxInput.value);

    if (!rawName) {
      alert("Please select a name.");
      return;
    }

    if (isNaN(pax) || pax <= 0) {
      alert("Please enter a valid number of pax.");
      return;
    }

    const assigned = autoAllocateTable(rawName, pax);

    if (assigned.length > 0) {
      alert(`Allocated ${rawName} (${pax} pax) to table(s): ${assigned.join(", ")}`);
      autoPaxInput.value = "";
    } else {
      alert("Could not allocate seats with current availability.");
    }
  });

  // Manage Names modal logic, Clear All, etc.
  manageNamesBtn.addEventListener("click", () => {
    namesList.innerHTML = "";
    presetNames.forEach(name => {
      const li = document.createElement("li");
      li.textContent = name;

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.style.marginLeft = "10px";
      deleteBtn.addEventListener("click", () => {
        const idx = presetNames.indexOf(name);
        if (idx !== -1) {
          presetNames.splice(idx, 1);
          saveData();
          populateNameSelect();
          populateAutoNameSelect();
          li.remove();
        }
      });

      li.appendChild(deleteBtn);
      namesList.appendChild(li);
    });

    manageNamesModal.style.display = "block";
  });

addNameBtn.addEventListener("click", () => {
  const newName = newNameInput.value.trim();
  if (newName && !presetNames.includes(newName)) {
    presetNames.push(newName);
    presetNames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    
    // Save only the presetNames to Firebase
    set(presetNamesRef, presetNames).catch(console.error);
    
    newNameInput.value = "";
    alert(`Added name: ${newName}`);
  } else {
    alert("Enter a valid and unique name.");
  }
});

  saveNamesBtn.addEventListener("click", () => {
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
      clearSquadsPresent();
      alert("All bookings cleared.");
    }
  });

  function updateExitSelectOnBookingsChange() {
    if (selectedTableNumber) {
      populateExitNameSelect(selectedTableNumber);
    }
  }

  // Accessibility improvements: close modals with ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      bookingModal.style.display = "none";
      manageNamesModal.style.display = "none";
    }
  });

  // Initial refresh
  refreshTables();
});



