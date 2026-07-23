const logRows = document.getElementById('logRows');
const refreshBtn = document.getElementById('refreshBtn');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');

async function readLogs() {
  try {
    const response = await fetch('/api/logs');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function renderLogs() {
  const logs = await readLogs();

  if (!logs.length) {
    logRows.innerHTML = '<tr><td colspan="5">No activity captured yet.</td></tr>';
    return;
  }

  logRows.innerHTML = logs
    .slice()
    .reverse()
    .map(log => {
      const details = JSON.stringify({
        ...log.details,
        ip: log.ip,
        location: log.location
      }, null, 2);
      return `
        <tr>
          <td>${escapeHtml(log.timestamp)}</td>
          <td>${escapeHtml(log.page)}</td>
          <td>${escapeHtml(log.event)}</td>
          <td>${escapeHtml(log.element || '-')}</td>
          <td>${escapeHtml(details)}</td>
        </tr>
      `;
    })
    .join('');
}

async function exportCsv() {
  const logs = await readLogs();
  const header = ['timestamp', 'page', 'event', 'element', 'details', 'ip', 'location'];
  const rows = logs.map(log => [
    log.timestamp,
    log.page,
    log.event,
    log.element || '',
    JSON.stringify(log.details || {}),
    log.ip || '',
    JSON.stringify(log.location || {})
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'activity-log.csv';
  link.click();
  URL.revokeObjectURL(url);
}

refreshBtn.addEventListener('click', renderLogs);
exportBtn.addEventListener('click', exportCsv);
clearBtn.addEventListener('click', async () => {
  await fetch('/api/logs', { method: 'DELETE' });
  renderLogs();
});

renderLogs();
