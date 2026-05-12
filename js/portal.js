const backend_url_base = "https://charmed-crane-easy.ngrok-free.app"

// ── DOM refs ──────────────────────────────────────────────────────────────────
const videoInput         = document.getElementById('videoFile');
const videoPreview       = document.getElementById('videoPreview');
const uploadBtn          = document.getElementById('uploadBtn');
const privacySelect      = document.getElementById('privacyStatus');
const commercialToggle   = document.getElementById('commercialToggle');
const commercialOptions  = document.getElementById('commercialOptions');
const yourBrandCheckbox  = document.getElementById('yourBrand');
const brandedContentChk  = document.getElementById('brandedContent');
const brandLabel         = document.getElementById('brandLabel');
const declarationText    = document.getElementById('declarationText');
const allowComment       = document.getElementById('allowComment');
const allowDuet          = document.getElementById('allowDuet');
const allowStitch        = document.getElementById('allowStitch');
const statusEl           = document.getElementById('status');

// Max video duration in seconds, set after creator_info loads (Req 1c)
let maxVideoDuration = null;
// Track whether a duration error is blocking upload
let durationError = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCookie(cname) {
    const name = cname + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    for (let c of decodedCookie.split(';')) {
        c = c.trim();
        if (c.indexOf(name) === 0) return c.substring(name.length);
    }
    return "";
}

// ── OAuth / UpdateDB (unchanged logic) ───────────────────────────────────────
async function UpdateDB() {
    const temp_token = new URLSearchParams(window.location.search).get("code");
    if (!temp_token) return;

    if (getCookie("open_id")) {
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    const encoded = encodeURIComponent(temp_token);
    const nll = await fetch(backend_url_base + `/tiktok/auth/?code=${encoded}`, {
        method: "POST",
    });
    const data = await nll.json();
    console.log(data);
    if (data && data.open_id) {
        const openID = data.open_id;
        console.log(openID);
        document.cookie = `open_id=${openID}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        console.log("No OpenID was returned. Try again");
    }
}

// ── Req 1: Fetch creator info ─────────────────────────────────────────────────
async function fetchCreatorInfo() {
    const open_id = getCookie('open_id');
    if (!open_id) return;

    try {
        const response = await fetch(backend_url_base + '/tiktok/user_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ open_id })
        });
        const data = await response.json();

        // Req 1b: Creator is out of posts — halt and prompt
        if (data.response === "creator out of posts") {
            statusEl.textContent = "You have reached your posting limit. Please try again later.";
            statusEl.className = "error";
            uploadBtn.disabled = true;
            return;
        }

        // Req 1a: Display nickname
        document.getElementById('creatorNickname').textContent = data.nickname;
        document.getElementById('creatorInfo').hidden = false;

        // Req 1c: Store max video duration for file-select validation
        maxVideoDuration = data.max_video_post_duration_sec || null;

        // Req 2b: Populate privacy dropdown from API
        populatePrivacyOptions(data.privacy_level_options || []);

        // Req 2c: Grey out / disable interactions the creator has turned off
        configureInteractions(data);

    } catch (err) {
        console.error("Failed to fetch creator info:", err);
        statusEl.textContent = "Failed to load creator info. Please refresh and try again.";
        statusEl.className = "error";
    }
}

// ── Req 2b: Privacy dropdown ──────────────────────────────────────────────────
const PRIVACY_LABELS = {
    PUBLIC_TO_EVERYONE:    'Public',
    MUTUAL_FOLLOW_FRIENDS: 'Friends',
    FOLLOWER_OF_CREATOR:   'Followers',
    SELF_ONLY:             'Only Me',
};

function populatePrivacyOptions(options) {
    options.forEach(opt => {
        const el = document.createElement('option');
        el.value = opt;
        el.textContent = PRIVACY_LABELS[opt] || opt;
        privacySelect.appendChild(el);
    });
}

// ── Req 2c: Interaction checkboxes ────────────────────────────────────────────
function configureInteractions(info) {
    if (info.comment_disabled) {
        allowComment.disabled = true;
        document.getElementById('commentLabel').classList.add('cb-disabled');
    }
    if (info.duet_disabled) {
        allowDuet.disabled = true;
        document.getElementById('duetLabel').classList.add('cb-disabled');
    }
    if (info.stitch_disabled) {
        allowStitch.disabled = true;
        document.getElementById('stitchLabel').classList.add('cb-disabled');
    }
}

// ── Req 1c: Video duration check ─────────────────────────────────────────────
videoInput.addEventListener('change', () => {
    const file = videoInput.files[0];
    if (!file) {
        videoPreview.hidden = true;
        return;
    }

    videoPreview.src = URL.createObjectURL(file);
    videoPreview.hidden = false;

    videoPreview.addEventListener('loadedmetadata', () => {
        if (maxVideoDuration && videoPreview.duration > maxVideoDuration) {
            statusEl.textContent = `Video exceeds the maximum allowed duration of ${maxVideoDuration} seconds for this account.`;
            statusEl.className = "error";
            durationError = true;
        } else {
            // Clear any prior duration error
            if (durationError) {
                statusEl.textContent = "";
                statusEl.className = "";
                durationError = false;
            }
        }
        updateUploadBtnState();
    }, { once: true });
});

// ── Req 3a: Commercial toggle ─────────────────────────────────────────────────
commercialToggle.addEventListener('change', () => {
    commercialOptions.hidden = !commercialToggle.checked;
    if (!commercialToggle.checked) {
        yourBrandCheckbox.checked = false;
        brandedContentChk.checked = false;
    }
    updateBrandLabel();
    updateDeclaration();
    updatePrivacyRestrictions();
    updateUploadBtnState();
});

yourBrandCheckbox.addEventListener('change', () => {
    updateBrandLabel();
    updateDeclaration();
    updateUploadBtnState();
});

brandedContentChk.addEventListener('change', () => {
    updateBrandLabel();
    updateDeclaration();
    updatePrivacyRestrictions();
    updateUploadBtnState();
});

privacySelect.addEventListener('change', () => {
    // No additional logic needed here beyond normal form state
    updateUploadBtnState();
});

// ── Req 3a: Brand label beneath commercial options ────────────────────────────
function updateBrandLabel() {
    if (!commercialToggle.checked) {
        brandLabel.hidden = true;
        return;
    }
    const both    = yourBrandCheckbox.checked && brandedContentChk.checked;
    const branded = !yourBrandCheckbox.checked && brandedContentChk.checked;
    const yours   = yourBrandCheckbox.checked && !brandedContentChk.checked;

    if (both || branded) {
        brandLabel.textContent = "Your photo/video will be labeled as 'Paid partnership'";
        brandLabel.hidden = false;
    } else if (yours) {
        brandLabel.textContent = "Your photo/video will be labeled as 'Promotional content'";
        brandLabel.hidden = false;
    } else {
        brandLabel.hidden = true;
    }
}

// ── Req 4: Declaration text ───────────────────────────────────────────────────
function updateDeclaration() {
    const brandedActive = commercialToggle.checked && brandedContentChk.checked;
    if (brandedActive) {
        declarationText.innerHTML =
            "By posting, you agree to TikTok's " +
            "<a href='https://www.tiktok.com/legal/bc-policy' target='_blank'>Branded Content Policy</a>" +
            " and Music Usage Confirmation";
    } else {
        declarationText.innerHTML = "By posting, you agree to TikTok's Music Usage Confirmation";
    }
}

// ── Req 3b: Disable "Only Me" when Branded Content is selected ────────────────
function updatePrivacyRestrictions() {
    const brandedActive = commercialToggle.checked && brandedContentChk.checked;
    Array.from(privacySelect.options).forEach(opt => {
        if (opt.value === 'SELF_ONLY') {
            opt.disabled = brandedActive;
            opt.title    = brandedActive
                ? "Branded content visibility cannot be set to private."
                : "";
            // If currently "Only Me" and branded is now active, reset selection
            if (brandedActive && privacySelect.value === 'SELF_ONLY') {
                privacySelect.value = '';
            }
        }
    });
}

// ── Upload button state (Req 3a tooltip + duration gate) ─────────────────────
function updateUploadBtnState() {
    if (durationError) {
        uploadBtn.disabled = true;
        uploadBtn.title = "";
        return;
    }
    const commercialOnNoneSelected =
        commercialToggle.checked &&
        !yourBrandCheckbox.checked &&
        !brandedContentChk.checked;

    if (commercialOnNoneSelected) {
        uploadBtn.disabled = true;
        // Req 3a: tooltip on hover when no commercial option chosen
        uploadBtn.title = "You need to indicate if your content promotes yourself, a third party, or both.";
    } else {
        uploadBtn.disabled = false;
        uploadBtn.title = "";
    }
}

// ── Req 5c: Upload (only fires after user clicks — explicit consent via declaration) ──
document.getElementById('uploadBtn').addEventListener('click', async (e) => {
    e.preventDefault();

    const title      = document.getElementById('title').value;
    const file       = videoInput.files[0];
    const privacyVal = privacySelect.value;

    if (!file) {
        statusEl.textContent = "Please select a video to upload.";
        statusEl.className = "error";
        return;
    }

    if (!privacyVal) {
        statusEl.textContent = "Please select a privacy status.";
        statusEl.className = "error";
        return;
    }

    statusEl.textContent = "Uploading…";
    statusEl.className = "";

    const formData = new FormData();
    formData.append('title',            title);
    formData.append('video',            file);
    formData.append('privacy_level',    privacyVal);
    formData.append('allow_comment',    allowComment.checked);
    formData.append('allow_duet',       allowDuet.checked);
    formData.append('allow_stitch',     allowStitch.checked);
    formData.append('commercial_content', commercialToggle.checked);
    formData.append('your_brand',       yourBrandCheckbox.checked);
    formData.append('branded_content',  brandedContentChk.checked);

    const open_id = getCookie('open_id');
    if (!open_id) { console.log("Cookie was not saved"); return; }
    formData.append('open_id', open_id);

    try {
        const response = await fetch(backend_url_base + '/tiktok/post/', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.publish_id) {
            // Req 5d: Inform user about processing time
            statusEl.textContent = "Video uploaded successfully! It may take a few minutes for your content to process and become visible on your profile.";
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

// ── Init ──────────────────────────────────────────────────────────────────────
UpdateDB().then(() => fetchCreatorInfo());
