let isSignUpMode = false;

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    const title = document.getElementById('form-title');
    const btn = document.getElementById('submit-btn');
    const toggleText = document.getElementById('toggle-text');

    if (isSignUpMode) {
        title.innerText = "LUNA SIGN UP";
        btn.innerText = "CREATE ACCOUNT";
        toggleText.innerText = "Already have an account? Login";
    } else {
        title.innerText = "LUNA LOGIN";
        btn.innerText = "ENTER SPACE";
        toggleText.innerText = "New here? Sign Up first";
    }
}

document.getElementById('auth-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const userField = document.getElementById('username');
    const passField = document.getElementById('password');
    const user = userField.value.trim();
    const pass = passField.value.trim();

    // 1. Get existing users or create an empty object if none exist
    let rawData = localStorage.getItem('luna_users');
    let registeredUsers = {};
    
    try {
        registeredUsers = rawData ? JSON.parse(rawData) : {};
    } catch (error) {
        console.error("Error parsing user data, resetting database.");
        registeredUsers = {};
    }

    if (isSignUpMode) {
        // --- SIGN UP LOGIC ---
        if (registeredUsers[user]) {
            alert("Username already taken! Choose another. ✨");
        } else {
            // Add new user to the object
            registeredUsers[user] = pass;
            // Save back to localStorage
            localStorage.setItem('luna_users', JSON.stringify(registeredUsers));
            
            console.log("User registered:", user);
            alert("Account created successfully! Now please login. 💪");
            
            // Clear fields and switch to login mode
            userField.value = "";
            passField.value = "";
            toggleAuthMode();
        }
    } else {
        // --- LOGIN LOGIC ---
        console.log("Attempting login for:", user);
        
        if (registeredUsers[user] && registeredUsers[user] === pass) {
            localStorage.setItem('luna_logged_in', 'true');
            localStorage.setItem('lunaUser', user);
            
            console.log("Login successful! Redirecting...");
            window.location.href = 'index.html'; 
        } else {
            alert("Invalid username or password. 🌙");
        }
    }
});