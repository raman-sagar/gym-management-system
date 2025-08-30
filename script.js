// script.js
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCd8gqOSxEDlAK9vjjyoLqLUrcjy0lLBj4",
  authDomain: "gym-management-system-9389.firebaseapp.com",
  projectId: "gym-management-system-9389",
  storageBucket: "gym-management-system-9389.firebasestorage.app",
  messagingSenderId: "756162785178",
  appId: "1:756162785178:web:c2e4503b45e583fa449423",
  measurementId: "G-086Q3264TQ",
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Display messages
function showMessage(elementId, message, isError = true) {
  const msgElement = document.getElementById(elementId);

  msgElement.textContent = message;
  console.log("showMessage", msgElement.textContent);
  msgElement.style.color = isError ? "red" : "green";
  setTimeout(() => (msgElement.textContent = ""), 5000);
}

// Check authentication and role
function checkAuthAndRole(requiredRole, currentPage) {
  return async (user) => {
    console.log("user", user);
    if (user) {
      const userDoc = await db.collection("users").doc(user.uid).get();
      console.log("userDoc", userDoc.exists ? userDoc.data() : null);
      console.log(userDoc.data().role, "=== ", requiredRole);
      if (userDoc.exists && userDoc.data().role === requiredRole) {
        console.log("Authorized User access to " + currentPage);
        return; // User is authorized
      } else {
        showMessage("message", "Unauthorized access.");
        auth.signOut();
        window.location.href = "index.html";
      }
    } else {
      window.location.href = "index.html";
    }
  };
}

// Login user
async function loginUser(event) {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    const userCredential = await auth.signInWithEmailAndPassword(
      email,
      password
    );
    const userDoc = await db
      .collection("users")
      .doc(userCredential.user.uid)
      .get();

    if (userDoc.exists) {
      const role = userDoc.data().role;
      if (role === "admin") {
        window.location.href = "admin_dashboard.html";
      } else if (role === "member") {
        window.location.href = "member_dashboard.html";
      } else if (role === "user") {
        window.location.href = "user_dashboard.html";
      }
    } else {
      showMessage("message", "User data not found.");
      auth.signOut();
    }
  } catch (error) {
    showMessage("message", error.message);
  }
}

// Signup user
async function signupUser(event) {
  event.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  if (!["member", "user", "admin"].includes(role)) {
    showMessage("message", "Invalid role selected.");
    return;
  }
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );
    await db.collection("users").doc(userCredential.user.uid).set({
      name,
      email,
      role,
      active: true,
      joinDate: new Date().toISOString(),
    });
    showMessage("message", "Signup successful! Please login.", false);
    setTimeout(() => (window.location.href = "index.html"), 1000);
  } catch (error) {
    showMessage("message", error.message);
  }
}

// Logout user
async function logoutUser() {
  await auth.signOut();
  window.location.href = "index.html";
}

// Load members (for admin or user dashboard)
async function uploadMembers(elementId, isAdmin = false) {
  const list = document.getElementById(elementId);

  list.innerHTML = "";
  const snapshot = await db
    .collection("users")
    .where("role", "==", "member")
    .where("active", "==", true)
    .get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "list-item";

    div.innerHTML = `
            <span>${data.name} (${data.email}) - Joined: ${new Date(
      data.joinDate
    ).toLocaleDateString()}</span> ${
      isAdmin
        ? `<button onclick="updateMember('${doc.id}')">Edit</button><button onclick="deleteMember('${doc.id}')">Delete</button>`
        : ""
    }`;
    list.appendChild(div);
  });
}

// Load members for select dropdowns
async function loadMembersForSelect(selectId) {
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Select Member</option>';
  const snapshot = await db
    .collection("users")
    .where("role", "==", "member")
    .where("active", "==", true)
    .get();
  snapshot.forEach((doc) => {
    const option = document.createElement("option");
    option.value = doc.id;
    option.textContent = doc.data().name;
    select.appendChild(option);
  });
}

// Add member (admin only, requires re-login for security)
async function addMember(event) {
  event.preventDefault();
  const name = document.getElementById("memberName").value;
  const email = document.getElementById("memberEmail").value;
  const password = document.getElementById("memberPassword").value;
  const joinDate = document.getElementById("joinDate").value;
  const feePackage = document.getElementById("feePackage").value;
  try {
    //Prompt admin to re-login (client-side workaround)
    const adminEmail = prompt("Re-enter admin email for security:");
    const adminPassword = prompt("Re-enter admin password:");
    await auth.signInWithEmailAndPassword(adminEmail, adminPassword);

    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );

    await db.collection("users").doc(userCredential.user.uid).set({
      name,
      email,
      role: "member",
      active: true,
      joinDate,
      feePackage,
    });
    showMessage("message", "Member added successfully!", false);
    document.getElementById("addMemberForm").reset();
    loadMembers("membersList", true);
    loadMembersForSelect("billMemberId");
    loadMembersForSelect("notifMemberId");
    loadMembersForSelect("dietMemberId");
    // Re-authenticate admin
    await auth.signInWithEmailAndPassword(adminEmail, adminPassword);
  } catch (error) {
    showMessage("message", error.message);
  }
}

// Update member (placeholder for editing)
function updateMember(memberId) {
  alert("Edit functionality to be implemented for member ID: " + memberId);
  // Implement a modal or form to edit member details and update Firestore
}

// Delete member (mark as inactive)
async function deleteMember(memberId) {
  if (confirm("Are you sure you want to delete this member?")) {
    try {
      await db.collection("users").doc(memberId).update({ active: false });
      showMessage("message", "Member deleted successfully!", false);
      loadMembers("membersList", true);
      loadMembersForSelect("billMemberId");
      loadMembersForSelect("notifMemberId");
      loadMembersForSelect("dietMemberId");
    } catch (error) {
      showMessage("message", error.message);
    }
  }
}

// Create bill
async function createBill(event) {
  event.preventDefault();
  const memberId = document.getElementById("billMemberId").value;
  const amount = document.getElementById("amount").value;
  const billDate = document.getElementById("billDate").value;
  try {
    await db.collection("bills").add({
      memberId,
      amount: parseFloat(amount),
      date: billDate,
      createdAt: new Date().toISOString(),
    });
    showMessage("message", "Bill created successfully!", false);
    document.getElementById("createBillForm").reset();
  } catch (error) {
    showMessage("message", error.message);
  }
}

// Load bills for member
async function loadBills() {
  try {
    const list = document.getElementById("billsList");
    list.innerHTML = "";
    const user = auth.currentUser;
    const snapshot = await db
      .collection("bills")
      .where("memberId", "==", user.uid)
      .get();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `Amount: $${data.amount} - Date: ${new Date(
        data.date
      ).toLocaleDateString()}`;
      list.appendChild(div);
    });
  } catch (error) {
    showMessage("message", error.message);
  }
}

// Assign notification
async function assignNotification(event) {
  event.preventDefault();
  const memberId = document.getElementById("notifMemberId").value;
  const message = document.getElementById("notifMessage").value;
  try {
    await db.collection("notifications").add({
      memberId,
      message,
      createdAt: new Date().toISOString(),
    });
    showMessage("message", "Notification assigned successfully!", false);
    document.getElementById("notificationForm").reset();
  } catch (error) {
    showMessage("message", error.message);
  }
}

// Load notifications for member
async function loadNotifications() {
  try {
    const list = document.getElementById("notificationsList");
    list.innerHTML = "";
    const user = auth.currentUser;
    const snapshot = await db
      .collection("notifications")
      .where("memberId", "==", user.uid)
      .get();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `${data.message} - ${new Date(
        data.createdAt
      ).toLocaleDateString()}`;
      list.appendChild(div);
    });
  } catch (error) {
    showMessage("message", error.message);
  }
}

// Add supplement
async function addSupplement(event) {
  event.preventDefault();
  const name = document.getElementById("suppName").value;
  const price = document.getElementById("suppPrice").value;
  try {
    await db.collection("supplements").add({
      name,
      price: parseFloat(price),
      createdAt: new Date().toISOString(),
    });
    showMessage("message", "Supplement added successfully!", false);
    document.getElementById("addSupplementForm").reset();
    loadSupplements();
  } catch (error) {
    showMessage("message", error.message);
  }
}

// Load supplements
async function loadSupplements() {
  const list = document.getElementById("supplementsList");
  list.innerHTML = "";
  const snapshot = await db.collection("supplements").get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `${data.name} - $${data.price}`;
    list.appendChild(div);
  });
}

async function addDiet(event) {
  event.preventDefault();
  const memberId = document.getElementById("dietMemberId").value;
  const details = document.getElementById("dietPlan").value;
  try {
    await db.collection("diets").add({
      memberId,
      details,
      createdAt: new Date().toISOString(),
    });
    showMessage("message", "Diet assigned successfully!", false);
    document.getElementById("addDietForm").reset();
    loadDiets();
  } catch (error) {
    showMessage("message", error.message);
  }
}

async function loadDiets() {
  const list = document.getElementById("dietsList");
  list.innerHTML = "";
  const snapshot = await db.collection("diets").get();
  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const memberDoc = await db.collection("users").doc(data.memberId).get();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `<strong>${
      memberDoc.exists ? memberDoc.data().name : "Unknown Member"
    }</strong>: ${data.details} - ${new Date(
      data.createdAt
    ).toLocaleDateString()}`;
    list.appendChild(div);
  });
}

async function loadMembers() {
  const list = document.getElementById("membersList");
  list.innerHTML = "";
  const snapshot = await db
    .collection("users")
    .where("role", "==", "member")
    .where("active", "==", true)
    .get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
            <span>${data.name} (${data.email}) - Joined: ${new Date(
      data.joinDate
    ).toLocaleDateString()}</span>
        `;
    list.appendChild(div);
  });
}

// Search members (client-side filtering)
async function searchMembers() {
  let query = document.getElementById("searchInput").value.toLowerCase();
  // query = query.trim();
  const list = document.getElementById("membersList");
  list.innerHTML = "";
  const snapshot = await db
    .collection("users")
    .where("role", "==", "member")
    .where("active", "==", true)
    .get();
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.name.toLowerCase().includes(query)) {
      const div = document.createElement("div");
      div.className = "list-item";
      div.innerHTML = `
            <span>${data.name} (${data.email}) - Joined: ${new Date(
        data.joinDate
      ).toLocaleDateString()}</span>
        `;
      list.appendChild(div);
    }
  });
}

async function exportReport() {
  const snapshot = await db
    .collection("users")
    .where("role", "==", "member")
    .get();
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Name,Email,Join Date,Fee Package\n";
  snapshot.forEach((doc) => {
    const data = doc.data();
    csvContent += `${data.name},${data.email},${new Date(
      data.joinDate
    ).toLocaleDateString()},${data.feePackage}\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "gym_members_report.csv");
  document.body.appendChild(link); // Required for FF
  link.click();
  document.body.removeChild(link); // Clean up after download
}

async function forgetPassword() {
  var email = document.getElementById("email").value;
  console.log(email);
  if (!email) {
    showMessage("message", "Please enter your email to reset password.");
    return;
  }
  try {
    debugger;
    let response = await firebase.auth().sendPasswordResetEmail(email);
    showMessage("message", "Password reset email sent to " + email, false);
    document.getElementById("email").value = "";
    return;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    showMessage("message", "Error: " + error.message);
    return;
  }
}

/*
System: ## Explanation of the Files

 style.css
- **Purpose**: Provides a clean, modern, and responsive UI for the GYM Management System.
- **Features**:
  - Consistent styling for all pages with a white container on a light gray background.
  - Form elements (inputs, selects, buttons) have a uniform look with padding and rounded borders.
  - Buttons have hover effects for better interactivity.
  - The `.list-item` class styles lists of members, bills, notifications, supplements, and diets.
  - Responsive design adjusts for smaller screens (below 600px).
  - Colors are professional (blue for buttons, red for errors, green for success messages).

### script.js
- **Firebase Integration**:
  - Initializes Firebase with placeholders for your Firebase config (replace with your actual config).
  - Uses Firebase Authentication for user login/signup and Firestore for data storage (users, bills, notifications, supplements, diets).
- **Authentication**:
  - `loginUser`: Handles user login and redirects based on role (admin, member, user).
  - `signupUser`: Allows members and users (trainers) to sign up; admin signup should be restricted in production.
  - `logoutUser`: Signs out the user and redirects to the login page.
- **Role-Based Access**:
  - `checkAuthAndRole`: Ensures users can only access their designated dashboard (admin, member, user).
- **Admin Features**:
  - `addMember`: Adds a new member (with re-login prompt for security).
  - `updateMember`: Placeholder for editing member details (alert-based; extend with a form for full implementation).
  - `deleteMember`: Marks members as inactive instead of deleting (soft delete).
  - `createBill`: Creates a bill for a member with amount and date.
  - `assignNotification`: Sends a notification to a member.
  - `addSupplement`: Adds a supplement to the store.
  - `addDiet`: Assigns a diet plan to a member.
  - `exportReport`: Exports member data as a CSV file.
- **Member Features**:
  - `loadBills`: Displays bill receipts for the logged-in member.
  - `loadNotifications`: Shows notifications for the logged-in member.
- **User (Trainer) Features**:
  - `loadMembers`: Displays member details.
  - `searchMembers`: Filters members by name (client-side search).
- **Helper Functions**:
  - `showMessage`: Displays temporary success/error messages.
  - `loadMembersForSelect`: Populates member dropdowns for admin forms.
  - `loadSupplements` and `loadDiets`: Display supplement and diet lists in admin dashboard.
- **Security Note**: The `addMember` function requires the admin to re-authenticate due to client-side limitations. In production, use Firebase Admin SDK on a server for user creation/deletion.

### Additional Notes
- **Firebase Config**: Replace the placeholder `firebaseConfig` in `script.js` with your Firebase project's configuration.
- **Security Considerations**:
  - Client-side user creation (`addMember`) is a workaround. Use Firebase Admin SDK in production to securely manage users.
  - Passwords are handled securely by Firebase Authentication, but ensure HTTPS is used.
- **Report Export**: The `exportReport` function generates a CSV download of member data. Extend it for more complex reports if needed.
- **Search Functionality**: The `searchMembers` function filters members client-side. For large datasets, consider server-side querying with Firestore.
- **Project Evaluation Metrics**: Hardcoded in `admin_dashboard.html` as placeholders (Accuracy: 95%, Usability: High). Implement actual metrics (e.g., user feedback, performance stats) in a real project.
- **Extensibility**: The supplement store and diet details are basic CRUD operations. Enhance with features like inventory tracking or detailed diet plans.
- **Deployment**: Host on Firebase Hosting or a local server (e.g., using VSCode's Live Server).
- **Responsive Design**: The CSS ensures usability on mobile devices, but test thoroughly.
- **Limitations**:
  - No image handling (e.g., for supplements) due to client-side focus.
  - No advanced validation (e.g., password strength) beyond basic HTML5 required fields.
  - Notifications are stored and displayed but not pushed (extend with Firebase Cloud Messaging for real-time notifications).

### How to Run
1. Replace Firebase config in `script.js`.
2. Host the files on a server (e.g., Firebase Hosting, or locally with `python -m http.server`).
3. Create an admin user manually in Firebase Authentication and Firestore (set role to 'admin').
4. Access `index.html` to start with the login page.

If you need further customization (e.g., specific styling tweaks, additional features like image uploads, or server-side logic), let me know! 
            
*/
