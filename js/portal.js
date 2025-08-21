// Display video preview
const backend_url_base = "https://charmed-crane-easy.ngrok-free.app"

const videoInput = document.getElementById('videoFile');
const videoPreview = document.getElementById('videoPreview');

async function UpdateDB(){
    temp_token = encodeURIComponent(new URLSearchParams(window.location.search).get("code"));

    nll = await fetch(backend_url_base + `/tiktok/auth/?code=${temp_token}`, {
        method: "POST",
    });
    data = await nll.json();
    console.log(data)
    if (data && data.open_id){
        const openID = data.openID
        document.cookie = `open_id=${openID}; path=/; max-age=${365 * 24 * 60 * 60}` 
    } else{console.log("No OpenID was returned. Try again")}

}; UpdateDB();





videoInput.addEventListener('change', () => {
    const file = videoInput.files[0];
    if (file) {
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = 'block';
    } else {
    videoPreview.style.display = 'none';
    }
});

// Handle upload button
document.getElementById('uploadBtn').addEventListener('click', async () => {
    const platform = document.getElementById('platform').value;
    const description = document.getElementById('description').value;
    const file = videoInput.files[0];
    const statusEl = document.getElementById('status');

    if (!file) {
    statusEl.textContent = "Please select a video to upload.";
    statusEl.className = "error";
    return;
    }

    statusEl.textContent = "Uploading...";
    statusEl.className = "";

    // Prepare form data
    const formData = new FormData();
    formData.append('description', description);
    formData.append('video', file);

    const getCookieValue = (name) => (
        document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')?.pop() || ''
    )
    formData.append('open_id', getCookieValue("open_id"))

    try {
    // Send to backend endpoint
    const response = await fetch( backend_url_base + '/tiktok/post/', {
        method: 'POST',
        body: formData
    });

    const data = await response.json();

    if (data.success) {
        statusEl.textContent = "Video uploaded successfully!";
        statusEl.className = "success";
    } else {
        statusEl.textContent = "Upload failed: " + (data.error || "Unknown error");
        statusEl.className = "error";
    }
    } catch (err) {
    console.error(err);
    statusEl.textContent = "An error occurred during upload.";
    statusEl.className = "error";
    }
});