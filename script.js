
function oauthSignIn() {
    // Google's OAuth 2.0 endpoint for requesting an access token
    var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

    // Create <form> element to submit parameters to OAuth 2.0 endpoint.
    var form = document.createElement('form');
    form.setAttribute('method', 'GET');
    form.setAttribute('action', oauth2Endpoint);

    // Parameters to pass to OAuth 2.0 endpoint.
    // https://www.googleapis.com/auth/userinfo.profile or email
    var params = {
        'client_id': '185664045255-sdam30enj9fb2fafn8ae8e14isl3e1d0.apps.googleusercontent.com',
        'redirect_uri': 'http://localhost:3500/api/auth/google',
        'response_type': 'token',
        'scope': 'https://www.googleapis.com/auth/userinfo.email',
        'include_granted_scopes': 'true',
        'state': 'pass-through value'
    };
    console.log("params here", params)
    const paramStore = params
    console.log("params is store this value", paramStore)
    // Add form parameters as hidden input values.
    for (var p in params) {
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', p);
        input.setAttribute('value', params[p]);
        form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
}

function getAccessTokenFromURL() {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    return params.get("access_token");
}

// Step 2: Store the token
const accessToken = getAccessTokenFromURL();
if (accessToken) {
    // console.log("Access Token :", accessToken);
    localStorage.setItem("access_token", accessToken);
    clearURLFragment();
} else {
    console.error("Access token not found!");
}

// Step 3: Clear the URL fragment
function clearURLFragment() {
    history.replaceState(null, "", window.location.pathname);
}
// Step 4: Use the token for API requests
const token = localStorage.getItem("access_token");
// console.log("access_token", token)
if (token) {
    fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("User Profile:", data);
            localStorage.setItem("userId", data.id)
            document.body.innerHTML += `<p>  ${data.name},Login Successfully</p>`;

        })
        .catch((error) => console.error("Error fetching user profile:", error));
}
//verifyaccessToken 
fetch("http://localhost:3500/api/verifyaccessToken", {
    method: "POST",
    headers: {
        "content-type": "application/json",
    },
    body: JSON.stringify({ "token": token })

}).then((response) => response.json())
    .then((data) => {
        console.log("data", data)

        const jwtToken = data.jwt; // JWT received from backend
        // console.log("JWT received:", jwtToken);
        // Store the JWT for future use
        localStorage.setItem("jwtToken", jwtToken);
    })
    .catch((error) => console.error("Error:", error));

const jwtTokenget = localStorage.getItem("jwtToken")
// console.log(jwtTokenget)
const userId = localStorage.getItem("userId");
// console.log(userId) // Get the userId from local storage
// Function to fetch data using GET request

const postData = async () => {
    const token = jwtTokenget

    try {
        const response = await fetch("http://localhost:3500/api/short", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Correctly formatted token
            },
        });
        console.log("Response status:", response.status);
        const data = await response.json();
        console.log("Response data:", data);

    } catch (error) {
        console.error("Error accessing API:", error);
    }
};

// Call the function
postData();


//analystics overall fetching
const fetchData = async () => {
    const token = jwtTokenget;
    console.log("Using Token:", token);
    console.log("Fetching for User ID:", userId);

    try {
        const url = `http://localhost:3500/analytics/overall?userId=${userId}`;

        const response = await fetch(url, {
            method: "GET", 
            headers: {
                "Authorization": `Bearer ${token}` 
            }
        });

        console.log("Response status:", response.status);

        if (response.ok) {
            const data = await response.json();
            console.log("Analytics Overall data:", data);
        } else {
            const errorText = await response.text();
            console.error("Error accessing API:", response.statusText, errorText);
        }
    } catch (error) {
        console.error("Error accessing API:", error);
    }
};
fetchData();