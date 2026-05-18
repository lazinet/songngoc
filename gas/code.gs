/**
 * Google Apps Script — Song Ngọc Backend
 * Deploy as: Web App → Execute as Me → Anyone can access
 *
 * Sheets structure (trong một Spreadsheet duy nhất):
 *   Sheet "lien-he"    → liên hệ tư vấn
 *   Sheet "tuyen-dung" → hồ sơ ứng tuyển
 *   Sheet "du-an"      → danh sách dự án (CMS)
 *   Sheet "tin-tuc"    → tin tức (CMS)
 *   Sheet "hoat-dong"  → hoạt động công ty (CMS)
 *   Sheet "tuyen-dung-posts" → vị trí tuyển dụng (CMS)
 *   Sheet "settings"   → cài đặt trang web
 */

const SPREADSHEET_ID = 'REPLACE_WITH_YOUR_SPREADSHEET_ID';
const NOTIFY_EMAIL   = 'songngoc.stmc@gmail.com';
const CC_EMAIL       = 'songngoc@sncc.vn';

/* ═══ GET: Serve JSON data for CMS/website ═══ */
function doGet(e) {
  try {
    const tab    = (e.parameter.tab    || '').toLowerCase();
    const action = (e.parameter.action || '').toLowerCase();
    const id     = e.parameter.id || '';

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    /* Public read endpoints */
    const publicTabs = ['du-an', 'tin-tuc', 'hoat-dong', 'tuyen-dung-posts', 'settings'];
    if (publicTabs.includes(tab)) {
      const sheet = ss.getSheetByName(tab);
      if (!sheet) return jsonResponse({ error: `Tab '${tab}' not found` }, 404);
      const data = sheetToJSON(sheet);
      /* Filter active only */
      const filtered = data.filter(r => String(r.active || r.hien_thi || '1').toLowerCase() !== '0');
      if (id) {
        const item = filtered.find(r => String(r.id) === id || r.slug === id);
        return jsonResponse(item || { error: 'Not found' }, item ? 200 : 404);
      }
      return jsonResponse(filtered);
    }

    /* Authenticated CMS endpoints */
    const token = e.parameter.token || '';
    if (tab === 'cms') {
      if (!verifyCmsToken(token)) return jsonResponse({ error: 'Unauthorized' }, 401);
      const allTabs = ['du-an', 'tin-tuc', 'hoat-dong', 'tuyen-dung-posts', 'settings', 'lien-he', 'tuyen-dung'];
      const result = {};
      allTabs.forEach(t => {
        const sh = ss.getSheetByName(t);
        if (sh) result[t] = sheetToJSON(sh);
      });
      return jsonResponse(result);
    }

    return jsonResponse({ error: 'Bad request' }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

/* ═══ POST: Receive form submissions + CMS writes ═══ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { type } = body;

    if (type === 'contact') return handleContact(body);
    if (type === 'apply')   return handleApply(body);
    if (type === 'cms_write') return handleCmsWrite(body);

    return jsonResponse({ error: 'Unknown type' }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

/* ── Handle contact form ── */
function handleContact(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('lien-he') || ss.insertSheet('lien-he');

  /* Ensure headers */
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian', 'Họ tên', 'Công ty', 'Điện thoại', 'Email', 'Dịch vụ', 'Nội dung', 'Nguồn', 'IP', 'Quốc gia']);
  }

  sheet.appendRow([
    new Date(),
    data.name    || '',
    data.company || '',
    data.phone   || '',
    data.email   || '',
    data.service || '',
    data.message || '',
    data.source  || '',
    data.ip      || '',
    data.country || '',
  ]);

  /* Send notification email */
  try {
    GmailApp.sendEmail(
      NOTIFY_EMAIL,
      `[Song Ngọc] Yêu cầu tư vấn mới từ ${data.name}`,
      `Khách hàng mới liên hệ:\n\n` +
      `Họ tên: ${data.name}\n` +
      `Công ty: ${data.company || 'N/A'}\n` +
      `Điện thoại: ${data.phone}\n` +
      `Email: ${data.email}\n` +
      `Dịch vụ: ${data.service || 'Chưa chọn'}\n\n` +
      `Nội dung:\n${data.message}\n\n` +
      `Nguồn: ${data.source}\n` +
      `Thời gian: ${new Date().toLocaleString('vi-VN')}`,
      { cc: CC_EMAIL }
    );

    /* Auto-reply to customer */
    GmailApp.sendEmail(
      data.email,
      'Xác nhận yêu cầu — Công ty Song Ngọc',
      `Kính gửi ${data.name},\n\n` +
      `Chúng tôi đã nhận được yêu cầu tư vấn của bạn và sẽ liên hệ lại trong vòng 24 giờ làm việc.\n\n` +
      `Nếu cần hỗ trợ khẩn cấp, vui lòng gọi hotline: 086 893 7699\n\n` +
      `Trân trọng,\nCông ty TNHH Cơ Khí Xây Dựng Song Ngọc\n` +
      `songngoc.stmc@gmail.com | 086 893 7699`,
      { from: NOTIFY_EMAIL, name: 'Song Ngọc Construction' }
    );
  } catch (emailErr) {
    console.error('Email failed:', emailErr);
  }

  return jsonResponse({ success: true });
}

/* ── Handle job application ── */
function handleApply(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('tuyen-dung') || ss.insertSheet('tuyen-dung');

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian', 'Họ tên', 'Điện thoại', 'Email', 'Vị trí', 'Giới thiệu', 'Nguồn']);
  }

  sheet.appendRow([
    new Date(),
    data.name     || '',
    data.phone    || '',
    data.email    || '',
    data.position || '',
    data.message  || '',
    data.source   || '',
  ]);

  try {
    GmailApp.sendEmail(
      NOTIFY_EMAIL,
      `[Song Ngọc] Hồ sơ ứng tuyển: ${data.position} — ${data.name}`,
      `Hồ sơ ứng tuyển mới:\n\n` +
      `Họ tên: ${data.name}\n` +
      `Điện thoại: ${data.phone}\n` +
      `Email: ${data.email}\n` +
      `Vị trí ứng tuyển: ${data.position}\n\n` +
      `Giới thiệu:\n${data.message}`,
      { cc: CC_EMAIL }
    );

    GmailApp.sendEmail(
      data.email,
      'Xác nhận hồ sơ ứng tuyển — Song Ngọc',
      `Kính gửi ${data.name},\n\n` +
      `Hồ sơ ứng tuyển vị trí "${data.position}" của bạn đã được nhận.\n` +
      `Chúng tôi sẽ xem xét và liên hệ trong vòng 3–5 ngày làm việc.\n\n` +
      `Trân trọng,\nPhòng Nhân sự — Công ty Song Ngọc\n086 893 7699`,
      { from: NOTIFY_EMAIL, name: 'Song Ngọc HR' }
    );
  } catch (emailErr) {
    console.error('Email failed:', emailErr);
  }

  return jsonResponse({ success: true });
}

/* ── CMS write (admin only) ── */
function handleCmsWrite(data) {
  if (!verifyCmsToken(data.token)) return jsonResponse({ error: 'Unauthorized' }, 401);

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(data.tab);
  if (!sheet) return jsonResponse({ error: `Tab not found: ${data.tab}` }, 404);

  const action = data.action; // 'upsert' | 'delete'

  if (action === 'delete') {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idCol   = headers.indexOf('id') + 1;
    if (!idCol) return jsonResponse({ error: 'No id column' }, 400);
    const rows = sheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][idCol - 1]) === String(data.id)) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
    return jsonResponse({ success: true });
  }

  if (action === 'upsert') {
    const record = data.record || {};
    const headers = sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : Object.keys(record);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    const idCol = headers.indexOf('id') + 1;
    let found = false;

    if (idCol && record.id) {
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][idCol - 1]) === String(record.id)) {
          const rowData = headers.map(h => record[h] !== undefined ? record[h] : '');
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowData]);
          found = true; break;
        }
      }
    }

    if (!found) {
      if (!record.id) record.id = String(Date.now());
      const rowData = headers.map(h => record[h] !== undefined ? record[h] : '');
      sheet.appendRow(rowData);
    }

    return jsonResponse({ success: true, id: record.id });
  }

  return jsonResponse({ error: 'Unknown action' }, 400);
}

/* ── Utils ── */

function sheetToJSON(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim().toLowerCase().replace(/\s+/g, '_'));
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] === '' ? null : row[i]; });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== null));
}

function verifyCmsToken(token) {
  /* Simple: compare with a ScriptProperty secret */
  const secret = PropertiesService.getScriptProperties().getProperty('CMS_TOKEN');
  return secret && token === secret;
}

function jsonResponse(data, status = 200) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
