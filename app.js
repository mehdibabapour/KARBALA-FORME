// --- CONFIGURATION ---
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwSkH5ncDk5P-vpebrMb2A8EBik1Jrzecw_kvG2RzEOMMV8MjmSuuG9JOtOICRbUq4/exec";

const form = document.getElementById('lotteryForm');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const popup = document.getElementById('customPopup');
const popupContent = document.getElementById('popupContent');

function playSound(id) {
    const sound = document.getElementById(id);
    if (sound) { sound.currentTime = 0; sound.play().catch(e => console.log("Audio play blocked")); }
}

function showPopup(title, message, type, buttonText, callback) {
    popupContent.innerHTML = `
        <h3 class="text-xl font-bold mb-2 ${type === 'success' ? 'text-green-600' : 'text-red-600'}">${title}</h3>
        <p class="text-gray-700 mb-6">${message}</p>
        <button id="popupBtn" class="w-full py-3 rounded-xl font-bold text-white transition ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}">
            ${buttonText}
        </button>
    `;
    popup.querySelector('div').className = `bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all ${type === 'success' ? 'border-t-8 border-green-500' : 'border-t-8 border-red-500'}`;
    popup.classList.remove('hidden');
    document.getElementById('popupBtn').onclick = () => {
        popup.classList.add('hidden');
        if (callback) callback();
    };
}

async function downloadReceipt(name, nat, mob, code) {
    document.getElementById('rec-name').innerText = name;
    document.getElementById('rec-nat').innerText = nat;
    document.getElementById('rec-mob').innerText = mob;
    document.getElementById('rec-code').innerText = code;

    const template = document.getElementById('receipt-template');
    const canvas = await html2canvas(template, { scale: 2 });
    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.download = `receipt-${code}.png`;
    link.href = image;
    link.click();
}

form.onsubmit = async (e) => {
    e.preventDefault();

    const fullName   = document.getElementById('fullName').value.trim();
    const nationalId = document.getElementById('nationalId').value.trim();
    const mobile     = document.getElementById('mobile').value.trim();

    // تقسیم نام کامل به firstName و lastName
    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '-';

    loading.style.display = 'flex';
    loadingText.innerText = 'در حال برقراری ارتباط...';
    playSound('audioLoading');

    try {
        const url = `${WEB_APP_URL}?action=register`
                  + `&firstName=${encodeURIComponent(firstName)}`
                  + `&lastName=${encodeURIComponent(lastName)}`
                  + `&nationalId=${encodeURIComponent(nationalId)}`
                  + `&mobile=${encodeURIComponent(mobile)}`;

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseErr) {
            console.error('Server raw response:', text);
            throw new Error('پاسخ سرور قابل تجزیه نیست: ' + text.substring(0, 100));
        }

        loading.style.display = 'none';

        if (result.status === 'success') {
            playSound('audioSuccess');
            showPopup(
                '🎉 موفقیت‌آمیز!',
                'ثبت‌نام شما با موفقیت انجام شد. لطفاً رسید خود را دریافت کنید.',
                'success',
                '📥 دانلود رسید قرعه‌کشی سفر کربلا',
                () => downloadReceipt(fullName, nationalId, mobile, result.trackingCode)
            );

        } else if (result.status === 'duplicate') {
            playSound('audioDuplicate');
            showPopup(
                '⚠️ قبلاً ثبت‌نام کرده‌اید',
                'شما قبلاً در این قرعه‌کشی ثبت‌نام کرده‌اید. برای دریافت مجدد رسید، روی دکمه زیر کلیک کنید:',
                'error',
                '📥 دریافت مجدد رسید',
                () => downloadReceipt(result.storedName, result.storedNationalId, result.storedMobile, result.trackingCode)
            );

        } else if (result.status === 'duplicate_national') {
            playSound('audioDuplicateNational');
            showPopup(
                '❌ کد ملی تکراری',
                'کد ملی شما تکراری است. ثبت‌نام امکان‌پذیر نیست.',
                'error',
                'بستن',
                null
            );

        } else if (result.status === 'duplicate_mobile') {
            playSound('audioDuplicateMobile');
            showPopup(
                '❌ شماره موبایل تکراری',
                'شماره موبایل شما تکراری است. ثبت‌نام امکان‌پذیر نیست.',
                'error',
                'بستن',
                null
            );

        } else if (result.status === 'closed') {
            showPopup(
                '🔒 ثبت‌نام بسته شده',
                result.message || 'مهلت ثبت‌نام به پایان رسیده است.',
                'error',
                'بستن',
                null
            );

        } else {
            throw new Error(result.message || 'خطای ناشناخته از سرور');
        }

    } catch (error) {
        loading.style.display = 'none';
        console.error('Error details:', error);
        showPopup(
            '❌ خطا',
            'خطایی در ارتباط با سرور رخ داد. لطفاً دوباره تلاش کنید.<br><small style="color:#999">' + error.message + '</small>',
            'error',
            'تلاش مجدد'
        );
    }
};

window.addEventListener('click', () => {
    if (!window.welcomePlayed) {
        playSound('audioWelcome');
        window.welcomePlayed = true;
    }
}, { once: true });
