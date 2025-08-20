
const backend_url_base = "https://charmed-crane-easy.ngrok-free.app/"

document.getElementById("tiktokLogin").addEventListener("click", () => {
    // TODO: Add a function for this in the backend, and then create a config with developer credentials 
      const clientKey = "sbaw9y0gyp43g6nq3x";

      const redirectUri = encodeURIComponent("https://yourfrontend.com/portal.html"); 
      const scope = encodeURIComponent("user.info.basic,video.upload");
      const responseType = "code";

      const authUrl = `https://www.tiktok.com/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=${responseType}&redirect_uri=${redirectUri}&state=xyz123`;

      window.location.href = authUrl;
    });