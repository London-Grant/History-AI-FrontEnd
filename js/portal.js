const backend_url_base = "https://charmed-crane-easy.ngrok-free.app"

// ── DOM refs ──────────────────────────────────────────────────────────────────
const videoInput             = document.getElementById('videoFile');
const videoPreview           = document.getElementById('videoPreview');
const uploadBtn              = document.getElementById('uploadBtn');
const privacySelect          = document.getElementById('privacyStatus');
const privacyBrandedWarning  = document.getElementById('privacyBrandedWarning'); // CHANGE 1
const commercialToggle       = document.getElementById('commercialToggle');
const commercialOptions      = document.getElementById('commercialOptions');
const yourBrandCheckbox      = document.getElementById('yourBrand');
const brandedContentChk      = document.getElementById('brandedContent');
const brandLabel             = document.getElementById('brandLabel');
const declarationText        = document.getElementById('declarationText');
const allowComment           = document.getElementById('allowComment');
const allowDuet              = document.getElementById('allowDuet');
const allowStitch            = document.getElementById('allowStitch');
const statusEl               = document.getElementById('status');
const pollStatusEl           = document.getElementById('pollStatus'); // CHANGE 2

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

// ── OAuth / UpdateDB ──────────────────────────────────────────────────────────
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
        const response = await fetch(backend_url_base + `/tiktok/user_data/?open_id=${open_id}`, {
            method: 'POST'
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
        document.getElementById('creatorNickname').textContent = data.creator_nickname;
        document.getElementById('creatorInfo').hidden = false;

        // Req 1c: Store max video duration for file-select validation
        maxVideoDuration = data.max_video_post_duration_sec || null;

        // Req 2b: Populate privacy dropdown from API
        populatePrivacyOptions(data.privacy_level_options || []);

        // Req 2c: Grey out / disable interactions the creator has turned off
        configureInteractions(data);

        // CHANGE 3: Re-evaluate button state now that privacy options are populated.
        // Previously updateUploadBtnState() was never called on init, so the button
        // would appear enabled before the user had selected a privacy level.
        updateUploadBtnState();

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
// CHANGE 4: Two fixes here:
//   (a) Replaced opt.title on the disabled <option> with a visible warning div.
//       Browser engines do not fire hover events on disabled <option> elements,
//       so the tooltip was silently broken in every major browser. The new
//       #privacyBrandedWarning div is shown whenever Branded Content is active.
//   (b) When SELF_ONLY is currently selected and the user enables Branded Content,
//       the old code reset privacySelect.value to '' (the empty placeholder),
//       leaving the form in an uncompleted state with no feedback.  The new code
//       auto-switches to the first available non-private option and displays an
//       informational message so the user knows what changed and why.
function updatePrivacyRestrictions() {
    const brandedActive = commercialToggle.checked && brandedContentChk.checked;

    // Show/hide the branded-content privacy warning (replaces non-functional opt.title)
    privacyBrandedWarning.hidden = !brandedActive;

    Array.from(privacySelect.options).forEach(opt => {
        if (opt.value === 'SELF_ONLY') {
            opt.disabled = brandedActive;

            if (brandedActive && privacySelect.value === 'SELF_ONLY') {
                // Find the first non-private, non-placeholder option to fall back to
                const fallback = Array.from(privacySelect.options).find(
                    o => o.value && o.value !== 'SELF_ONLY' && !o.disabled
                );
                if (fallback) {
                    privacySelect.value = fallback.value;
                    statusEl.textContent =
                        `Privacy has been changed to "${fallback.textContent}" because branded content cannot be set to private.`;
                    statusEl.className = "info";
                } else {
                    // No fallback available — reset to placeholder and surface the warning
                    privacySelect.value = '';
                }
            }
        }
    });
}

// ── Upload button state ───────────────────────────────────────────────────────
// CHANGE 5: Added Gate 2 — disables the button when no privacy option is selected.
// Previously the button appeared fully active the moment the page loaded, even
// though the privacy dropdown was empty. The first actionable error only surfaced
// at click time. Now the button correctly stays disabled until the user picks a
// privacy level, matching standard form-completion UX.
function updateUploadBtnState() {
    // Gate 1: video duration error
    if (durationError) {
        uploadBtn.disabled = true;
        uploadBtn.title = "";
        return;
    }

    // Gate 2: no privacy level selected yet
    if (!privacySelect.value) {
        uploadBtn.disabled = true;
        uploadBtn.title = "";
        return;
    }

    // Gate 3: commercial toggle on but no brand type selected (Req 3a)
    const commercialOnNoneSelected =
        commercialToggle.checked &&
        !yourBrandCheckbox.checked &&
        !brandedContentChk.checked;

    if (commercialOnNoneSelected) {
        uploadBtn.disabled = true;
        uploadBtn.title = "You need to indicate if your content promotes yourself, a third party, or both.";
    } else {
        uploadBtn.disabled = false;
        uploadBtn.title = "";
    }
}

// ── Req 5e: Poll publish status after upload ──────────────────────────────────
// CHANGE 6: This function was entirely missing from the original code.
// TikTok requires API clients to poll /v2/post/publish/status/fetch/ (or handle
// webhooks) so users can see the real status of their post.  Without this, a
// creator has no way of knowing whether their video actually made it through
// TikTok's processing pipeline or silently failed.
//
// Backend requirement: add POST /tiktok/publish/status/ that accepts
// ?publish_id=...&open_id=..., looks up the creator's access token, calls
// POST https://open.tiktokapis.com/v2/post/publish/status/fetch/
// with body { "publish_id": "<id>" }, and returns { status, fail_reason }.
// Possible status values from TikTok: PROCESSING_DOWNLOAD, SEND_TO_USER_INBOX,
// PUBLISH_COMPLETE, FAILED.
async function pollPublishStatus(publishId) {
    const open_id      = getCookie('open_id');
    const MAX_ATTEMPTS = 1000;
    const INTERVAL_MS  = 3000;
    let   attempts     = 0;

    pollStatusEl.textContent = "Checking publish status…";
    pollStatusEl.className   = "";

    const poll = async () => {
        attempts++;
        if (attempts > MAX_ATTEMPTS) {
            pollStatusEl.textContent =
                "Status check timed out. Please check your TikTok profile in a few minutes.";
            pollStatusEl.className = "warning";
            return;
        }

        try {
            const resp = await fetch(
                backend_url_base +
                `/tiktok/publish/status/?publish_id=${encodeURIComponent(publishId)}&open_id=${encodeURIComponent(open_id)}`,
                { method: 'POST' }
            );
            const data = await resp.json();
            const publishStatus = data.status;

            if (publishStatus === 'PUBLISH_COMPLETE') {
                pollStatusEl.textContent = "Your video is now live on your TikTok profile!";
                pollStatusEl.className   = "success";
            } else if (publishStatus === 'FAILED') {
                const reason = data.fail_reason || "Unknown error";
                pollStatusEl.textContent = `Publishing failed: ${reason}. Please try again.`;
                pollStatusEl.className   = "error";
            } else {
                // Still in flight: PROCESSING_DOWNLOAD, SEND_TO_USER_INBOX, etc.
                pollStatusEl.textContent = `Processing your video… (${publishStatus || 'checking'})`;
                setTimeout(poll, INTERVAL_MS);
            }
        } catch (err) {
            console.error("Status poll error:", err);
            // Retry on transient network errors up to the attempt cap
            if (attempts < MAX_ATTEMPTS) {
                setTimeout(poll, INTERVAL_MS);
            } else {
                pollStatusEl.textContent =
                    "Could not verify publish status. Please check your TikTok profile.";
                pollStatusEl.className = "warning";
            }
        }
    };

    setTimeout(poll, INTERVAL_MS);
}

// ── Req 5c: Upload ────────────────────────────────────────────────────────────
document.getElementById('uploadBtn').addEventListener('click', async (e) => {
    e.preventDefault();

    const title      = document.getElementById('title').value;
    const file       = videoInput.files[0];
    const privacyVal = privacySelect.value;

    if (!file) {
        statusEl.textContent = "Please select a video to upload.";
        statusEl.className   = "error";
        return;
    }

    if (!privacyVal) {
        statusEl.textContent = "Please select a privacy status.";
        statusEl.className   = "error";
        return;
    }

    // Safety net: branded content must not be posted as private
    if (brandedContentChk.checked && privacyVal === 'SELF_ONLY') {
        statusEl.textContent = "Branded content cannot be set to private. Please change your privacy setting.";
        statusEl.className   = "error";
        return;
    }

    statusEl.textContent    = "Uploading…";
    statusEl.className      = "";
    // CHANGE 7: Clear any stale polling message from a previous upload attempt
    pollStatusEl.textContent = "";
    pollStatusEl.className   = "";

    const formData = new FormData();
    formData.append('title',              title);
    formData.append('video',              file);
    formData.append('privacy_level',      privacyVal);
    formData.append('allow_comment',      allowComment.checked);
    formData.append('allow_duet',         allowDuet.checked);
    formData.append('allow_stitch',       allowStitch.checked);
    formData.append('commercial_content', commercialToggle.checked);
    formData.append('your_brand',         yourBrandCheckbox.checked);
    formData.append('branded_content',    brandedContentChk.checked);

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
            statusEl.textContent =
                "Video submitted! It may take a few minutes for your content to process and become visible on your profile.";
            statusEl.className = "success";
            // CHANGE 6 (cont.): Begin polling now that we have a publish_id
            pollPublishStatus(data.publish_id);
        } else {
            statusEl.textContent = "Upload failed: " + (data.error || "Unknown error");
            statusEl.className   = "error";
        }
    } catch (err) {
        console.error(err);
        statusEl.textContent = "An error occurred during upload.";
        statusEl.className   = "error";
    }
});

// ── Init ──────────────────────────────────────────────────────────────────────
// CHANGE 3 (cont.): Disable the button immediately so it is never clickable
// before creator info has loaded and the user has selected a privacy level.
uploadBtn.disabled = true;
UpdateDB().then(() => fetchCreatorInfo());
