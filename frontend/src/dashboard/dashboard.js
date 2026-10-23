/**
 * @fileoverview Main Clinical Dashboard Controller for LifeBridge.
 * Lazy-loaded via dynamic import(). Manages sidebar navigation, views,
 * modals, interactive charts, profile management, and contact dispatches.
 * @module dashboard/dashboard
 */

import {
  computeOverviewStats,
  computeUrgencyBreakdown,
  computeLast7DaysTrend,
  filterAnalyses,
  sortAnalyses,
  paginate,
  formatProfileContextForAnalysis,
  formatWhatsAppShareUrl,
  exportAnalysesToCsv,
  calculateCprCycle,
  formatMedicalHandoverSummary,
  formatEmergencyBroadcastSms
} from './dashboardMath.js';

import {
  getCurrentUser,
  logoutUser,
  loginDemoUser,
  getAnalysesForUser,
  getProfilesForUser,
  saveProfile,
  deleteProfile,
  getActiveProfile,
  setActiveProfile,
  getContactsForUser,
  saveContact,
  deleteContact,
  getSettingsForUser,
  saveSettingsForUser,
  exportUserDataJson,
  deleteUserData
} from './dashboardStore.js';

import {
  renderUrgencyBreakdownSvg,
  renderLast7DaysSvg
} from './dashboardCharts.js';

/**
 * Mounts and bootstraps the Clinical Decision Dashboard.
 *
 * @param {HTMLElement} mountContainer - The element to render the dashboard into.
 * @param {Object} [options]
 * @param {Function} [options.onNavigateToTriage] - Callback when user clicks "New Analysis" or "Back to Terminal".
 * @returns {Object} Dashboard API handle with update and destroy methods.
 */
export function initDashboard(mountContainer, { onNavigateToTriage = () => {} } = {}) {
  if (!mountContainer) return null;

  let activeTab = 'overview';
  let historySearch = '';
  let historyUrgency = 'ALL';
  let historySort = 'date';
  let historySortOrder = 'desc';
  let historyPage = 1;
  const historyPageSize = 5;

  // CPR Metronome State
  let cprRunning = false;
  let cprBpm = 110;
  let cprCompressions = 0;
  let cprSoundEnabled = false;
  let cprTimerId = null;
  let audioCtx = null;

  // Tourniquet Stopwatch State
  let stopwatchRunning = false;
  let stopwatchSeconds = 0;
  let stopwatchTimerId = null;

  let currentUser = getCurrentUser();
  if (!currentUser) {
    currentUser = loginDemoUser().user;
  }

  // Inject dashboard styles if not already injected
  if (!document.getElementById('lifebridge-dashboard-css')) {
    const link = document.createElement('link');
    link.id = 'lifebridge-dashboard-css';
    link.rel = 'stylesheet';
    link.href = '/src/dashboard/dashboard.css';
    document.head.appendChild(link);
  }

  function render() {
    currentUser = getCurrentUser() || loginDemoUser().user;
    const userId = currentUser.id;

    const analyses = getAnalysesForUser(userId);
    const profiles = getProfilesForUser(userId);
    const contacts = getContactsForUser(userId);
    const settings = getSettingsForUser(userId);
    const activeProfile = getActiveProfile();

    mountContainer.innerHTML = `
      <div class="dashboard-root" role="region" aria-label="LifeBridge Clinical Dashboard">
        <!-- 1. LEFT SIDEBAR -->
        <aside class="dash-sidebar" id="dash-sidebar" aria-label="Dashboard Navigation">
          <div class="dash-sidebar-header">
            <a href="#" class="dash-brand-title" id="dash-brand-link">
              LifeBridge<span class="period">.</span>
            </a>
            <div class="dash-brand-sub">CLINICAL DECISION SUITE // 108</div>
          </div>

          <nav class="dash-sidebar-nav">
            <ul class="dash-nav-list" role="tablist">
              <li class="dash-nav-item">
                <button type="button" role="tab" aria-selected="${activeTab === 'overview'}" class="${activeTab === 'overview' ? 'active' : ''}" data-tab="overview" id="tab-overview">
                  <span class="dash-nav-icon" aria-hidden="true">📊</span>
                  <span>Overview</span>
                </button>
              </li>
              <li class="dash-nav-item">
                <button type="button" role="tab" aria-selected="${activeTab === 'history'}" class="${activeTab === 'history' ? 'active' : ''}" data-tab="history" id="tab-history">
                  <span class="dash-nav-icon" aria-hidden="true">📋</span>
                  <span>History (${analyses.length})</span>
                </button>
              </li>
              <li class="dash-nav-item">
                <button type="button" role="tab" aria-selected="${activeTab === 'profiles'}" class="${activeTab === 'profiles' ? 'active' : ''}" data-tab="profiles" id="tab-profiles">
                  <span class="dash-nav-icon" aria-hidden="true">👤</span>
                  <span>Patient profiles (${profiles.length})</span>
                </button>
              </li>
              <li class="dash-nav-item">
                <button type="button" role="tab" aria-selected="${activeTab === 'contacts'}" class="${activeTab === 'contacts' ? 'active' : ''}" data-tab="contacts" id="tab-contacts">
                  <span class="dash-nav-icon" aria-hidden="true">📞</span>
                  <span>Emergency contacts (${contacts.length})</span>
                </button>
              </li>
              <li class="dash-nav-item">
                <button type="button" role="tab" aria-selected="${activeTab === 'settings'}" class="${activeTab === 'settings' ? 'active' : ''}" data-tab="settings" id="tab-settings">
                  <span class="dash-nav-icon" aria-hidden="true">⚙️</span>
                  <span>Settings</span>
                </button>
              </li>
            </ul>

            <button type="button" class="dash-back-terminal" id="btn-back-to-terminal">
              &larr; Triage Terminal
            </button>
          </nav>

          <div class="dash-sidebar-footer">
            <div class="dash-user-badge">
              <div class="dash-user-info">
                <div class="dash-user-name">${escapeHtml(currentUser.name)}</div>
                <div class="dash-user-role">${escapeHtml(currentUser.role)} ${currentUser.isDemo ? '(Demo)' : ''}</div>
              </div>
              <button type="button" class="dash-btn-logout" id="btn-logout" title="Log out session" aria-label="Log out">
                Exit
              </button>
            </div>
          </div>
        </aside>

        <!-- 2. MAIN VIEW AREA -->
        <main class="dash-main" id="dash-main-stage">
          <header class="dash-topbar">
            <div style="display: flex; align-items: center; gap: 14px;">
              <button type="button" class="dash-mobile-toggle" id="btn-mobile-sidebar-toggle" aria-label="Toggle navigation menu">
                ☰
              </button>
              <h1 class="dash-view-title" id="dash-view-heading">
                ${getViewTitle(activeTab)}
              </h1>
            </div>

            <div class="dash-topbar-actions">
              ${activeProfile ? `
                <div class="dash-chip" style="background-color: var(--dash-pigment-subtle); border-color: rgba(179,57,39,0.3); color: var(--dash-pigment);" title="Active clinical context">
                  Active: <strong>${escapeHtml(activeProfile.name)}</strong> (${activeProfile.age}y)
                </div>
              ` : ''}
              <button type="button" class="dash-btn dash-btn-outline" id="btn-topbar-new-analysis">
                + New analysis
              </button>
              <button type="button" class="dash-btn dash-btn-sos" id="btn-topbar-broadcast-sos" style="background-color: #991b1b;" aria-label="Broadcast Emergency SOS">
                📢 Broadcast SOS
              </button>
              <a href="tel:108" class="dash-btn dash-btn-sos" aria-label="Emergency SOS call 108">
                🚨 SOS 108
              </a>
            </div>
          </header>

          <div class="dash-content-body">
            ${renderTabContent({ activeTab, analyses, profiles, contacts, settings, activeProfile, userId })}
          </div>
        </main>
      </div>

      <!-- Detail / Edit Modal Container -->
      <div id="dash-modal-root" aria-live="polite"></div>
    `;

    attachEventListeners({ analyses, profiles, contacts, settings, activeProfile, userId });
  }

  function getViewTitle(tab) {
    switch (tab) {
      case 'overview': return 'Clinical Overview';
      case 'history': return 'Triage Case History';
      case 'profiles': return 'Family Patient Profiles';
      case 'contacts': return 'Emergency Dispatch Contacts';
      case 'settings': return 'System Settings & Data Control';
      default: return 'Clinical Dashboard';
    }
  }

  /* ==========================================================================
     TAB CONTENT RENDERERS
     ========================================================================== */

  function renderTabContent({ activeTab, analyses, profiles, contacts, settings, activeProfile, userId }) {
    switch (activeTab) {
      case 'overview':
        return renderOverviewView({ analyses, contacts, activeProfile });
      case 'history':
        return renderHistoryView({ analyses });
      case 'profiles':
        return renderProfilesView({ profiles, activeProfile });
      case 'contacts':
        return renderContactsView({ contacts, analyses });
      case 'settings':
        return renderSettingsView({ settings });
      default:
        return `<p>Select a tab from the sidebar.</p>`;
    }
  }

  function renderOverviewView({ analyses, contacts, activeProfile }) {
    const stats = computeOverviewStats(analyses);
    const breakdown = computeUrgencyBreakdown(analyses);
    const trend = computeLast7DaysTrend(analyses);
    const cprStatus = calculateCprCycle(cprCompressions);

    return `
      <!-- 4 METRIC STAT CARDS -->
      <section class="dash-stats-grid" aria-label="Overview Key Metrics">
        <div class="dash-stat-card">
          <div class="dash-stat-label">Total Analyses</div>
          <div class="dash-stat-value">${stats.total}</div>
          <div class="dash-stat-desc">Multimodal triage evaluations</div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-label">Critical Cases</div>
          <div class="dash-stat-value" style="color: var(--dash-pigment);">${stats.critical}</div>
          <div class="dash-stat-desc">Life-threatening emergencies</div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-label">Average Confidence</div>
          <div class="dash-stat-value">${stats.avgConfidence}%</div>
          <div class="dash-stat-desc">Clinical model corroboration</div>
        </div>
        <div class="dash-stat-card">
          <div class="dash-stat-label">Facts Pruned by Verifier</div>
          <div class="dash-stat-value" style="color: var(--dash-teal);">${stats.factsPruned}</div>
          <div class="dash-stat-desc">Unsafe / uncorroborated facts pruned</div>
        </div>
      </section>

      <!-- 2 INLINE SVG CHARTS -->
      <section class="dash-charts-grid" aria-label="Clinical Activity Charts">
        <!-- Chart 1: Urgency Breakdown Donut -->
        <div class="dash-card">
          <div class="dash-card-header">
            <h2 class="dash-card-title">Urgency Breakdown</h2>
            <span class="dash-stat-label">${breakdown.total} EVALUATIONS</span>
          </div>
          <div style="padding: 10px 0;">
            ${renderUrgencyBreakdownSvg(breakdown, { size: 220 })}
          </div>
          <div class="urgency-legend">
            <div class="urgency-legend-item">
              <span class="legend-dot" style="background-color: var(--dash-pigment);"></span>
              <span>Critical: <strong>${breakdown.counts.CRITICAL}</strong> (${breakdown.percentages.CRITICAL}%)</span>
            </div>
            <div class="urgency-legend-item">
              <span class="legend-dot" style="background-color: var(--dash-amber);"></span>
              <span>High: <strong>${breakdown.counts.HIGH}</strong> (${breakdown.percentages.HIGH}%)</span>
            </div>
            <div class="urgency-legend-item">
              <span class="legend-dot" style="background-color: var(--dash-teal);"></span>
              <span>Medium: <strong>${breakdown.counts.MEDIUM}</strong> (${breakdown.percentages.MEDIUM}%)</span>
            </div>
            <div class="urgency-legend-item">
              <span class="legend-dot" style="background-color: var(--dash-sage);"></span>
              <span>Low: <strong>${breakdown.counts.LOW}</strong> (${breakdown.percentages.LOW}%)</span>
            </div>
          </div>
        </div>

        <!-- Chart 2: 7-Day Case Volume -->
        <div class="dash-card">
          <div class="dash-card-header">
            <h2 class="dash-card-title">Last 7 Days Activity</h2>
            <span class="dash-stat-label">CASES / DAY</span>
          </div>
          <div style="padding: 10px 0;">
            ${renderLast7DaysSvg(trend, { width: 440, height: 210 })}
          </div>
          <div style="display: flex; gap: 16px; margin-top: 14px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--dash-text-muted);">
            <span>■ Slate: Total cases</span>
            <span style="color: var(--dash-pigment);">■ Rust: Critical tier</span>
          </div>
        </div>
      </section>

      <!-- QUICK ACTIONS STRIP -->
      <div class="dash-card" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="font-family: 'Fraunces', serif; font-size: 17px; font-weight: 600;">Initiate New Multimodal Case</div>
          <div style="font-size: 12.5px; color: var(--dash-text-muted); margin-top: 2px;">
            Ingest Hindi/English voice transcripts, notes, and injury photos through 3-tier verifier.
          </div>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="dash-btn dash-btn-primary" id="btn-overview-new-analysis">
            + New Analysis
          </button>
          <button type="button" class="dash-btn dash-btn-sos" id="btn-overview-broadcast-sos" style="background-color: #991b1b;">
            📢 Broadcast SOS
          </button>
          <a href="tel:108" class="dash-btn dash-btn-sos">
            🚨 Call 108 EMS
          </a>
        </div>
      </div>

      <!-- CPR METRONOME & TOURNIQUET FIRST-AID WIDGET -->
      <section class="cpr-timer-card" aria-label="CPR Metronome and Tourniquet Stopwatch">
        <div class="cpr-timer-header">
          <div class="cpr-timer-title">
            <span>❤️</span> First-Aid CPR Metronome & Tourniquet Stopwatch
          </div>
          <div style="font-size: 11.5px; color: var(--dash-text-muted); font-family: 'JetBrains Mono', monospace;">
            AHA 30:2 PROTOCOL CADENCE
          </div>
        </div>

        <div class="cpr-grid">
          <!-- CPR METRONOME -->
          <div class="cpr-pulse-box">
            <div style="font-weight: 600; font-size: 13.5px; margin-bottom: 4px;">Chest Compression Cadence</div>
            <div class="cpr-pulse-ring ${cprRunning ? 'pulsing' : ''}" id="cpr-pulse-visual">
              💓
            </div>
            <div class="cpr-count-display" id="cpr-count-val">${cprCompressions}</div>
            <div class="cpr-sub-prompt" id="cpr-prompt-text">
              ${cprStatus.prompt}
            </div>

            <div id="cpr-breath-banner" style="display: ${cprStatus.isRescueBreaths ? 'block' : 'none'}; width: 100%;">
              <div class="cpr-breath-alert">
                <span>⚠️</span> <strong>GIVE 2 RESCUE BREATHS NOW</strong> (1 sec each, watch chest rise)
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; justify-content: center;">
              <button type="button" class="dash-btn-sm ${cprRunning ? 'dash-btn-sos' : 'dash-btn-primary'}" id="btn-toggle-cpr">
                ${cprRunning ? '⏹ Stop Cadence' : '▶ Start Metronome'}
              </button>
              <button type="button" class="dash-btn-sm dash-btn-outline" id="btn-reset-cpr">
                Reset (0)
              </button>
              <button type="button" class="dash-btn-sm dash-btn-outline" id="btn-toggle-cpr-sound" title="Toggle audio click">
                ${cprSoundEnabled ? '🔊 Sound On' : '🔇 Muted'}
              </button>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 11.5px; color: var(--dash-text-muted);">
              <span>Cadence:</span>
              <button type="button" class="dash-btn-sm btn-cpr-bpm ${cprBpm === 100 ? 'dash-btn-primary' : 'dash-btn-outline'}" data-bpm="100" style="padding: 2px 8px; font-size: 11px;">100 BPM</button>
              <button type="button" class="dash-btn-sm btn-cpr-bpm ${cprBpm === 110 ? 'dash-btn-primary' : 'dash-btn-outline'}" data-bpm="110" style="padding: 2px 8px; font-size: 11px;">110 BPM</button>
              <button type="button" class="dash-btn-sm btn-cpr-bpm ${cprBpm === 120 ? 'dash-btn-primary' : 'dash-btn-outline'}" data-bpm="120" style="padding: 2px 8px; font-size: 11px;">120 BPM</button>
            </div>
          </div>

          <!-- TOURNIQUET STOPWATCH -->
          <div class="stopwatch-box">
            <div>
              <div style="font-weight: 600; font-size: 13.5px; margin-bottom: 4px;">Tourniquet / Pressure Application Elapsed Time</div>
              <div style="font-size: 12px; color: var(--dash-text-muted);">
                Accurately track elapsed time since acute hemorrhage control or tourniquet placement for EMS handover.
              </div>
            </div>

            <div class="stopwatch-display" id="stopwatch-display">
              ${formatStopwatchTime(stopwatchSeconds)}
            </div>

            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
              <button type="button" class="dash-btn-sm ${stopwatchRunning ? 'dash-btn-outline' : 'dash-btn-primary'}" id="btn-toggle-stopwatch">
                ${stopwatchRunning ? '⏸ Pause' : '▶ Start Timer'}
              </button>
              <button type="button" class="dash-btn-sm dash-btn-outline" id="btn-reset-stopwatch">
                Reset
              </button>
            </div>

            <div style="font-size: 11px; color: var(--dash-text-muted); text-align: center; margin-top: 8px; font-family: 'JetBrains Mono', monospace;">
              CRITICAL: Never remove tourniquet in field once applied. Report elapsed time to 108 crew.
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function renderHistoryView({ analyses }) {
    // 1. Filter
    const filtered = filterAnalyses(analyses, {
      search: historySearch,
      urgency: historyUrgency
    });

    // 2. Sort
    const sorted = sortAnalyses(filtered, {
      sortBy: historySort,
      order: historySortOrder
    });

    // 3. Paginate
    const paginated = paginate(sorted, historyPage, historyPageSize);

    return `
      <section class="history-toolbar" aria-label="History Search and Filter Controls">
        <input
          type="search"
          class="history-search-input"
          id="history-search"
          placeholder="Search symptoms, summaries, prescriptions..."
          value="${escapeHtml(historySearch)}"
          aria-label="Search case history"
        />

        <div class="history-filters">
          <button type="button" class="filter-pill ${historyUrgency === 'ALL' ? 'active' : ''}" data-urgency="ALL">
            All (${analyses.length})
          </button>
          <button type="button" class="filter-pill ${historyUrgency === 'CRITICAL' ? 'active' : ''}" data-urgency="CRITICAL">
            🚨 Critical
          </button>
          <button type="button" class="filter-pill ${historyUrgency === 'HIGH' ? 'active' : ''}" data-urgency="HIGH">
            ⚠️ High
          </button>
          <button type="button" class="filter-pill ${historyUrgency === 'MEDIUM' ? 'active' : ''}" data-urgency="MEDIUM">
            🟡 Medium
          </button>
          <button type="button" class="filter-pill ${historyUrgency === 'LOW' ? 'active' : ''}" data-urgency="LOW">
            🟢 Low
          </button>
        </div>

        <select class="history-sort-select" id="history-sort" aria-label="Sort case history">
          <option value="date-desc" ${historySort === 'date' && historySortOrder === 'desc' ? 'selected' : ''}>Date: Newest First</option>
          <option value="date-asc" ${historySort === 'date' && historySortOrder === 'asc' ? 'selected' : ''}>Date: Oldest First</option>
          <option value="urgency-desc" ${historySort === 'urgency' ? 'selected' : ''}>Urgency: Highest First</option>
          <option value="confidence-desc" ${historySort === 'confidence' ? 'selected' : ''}>Confidence: Highest First</option>
        </select>

        <button type="button" class="dash-btn-sm dash-btn-outline" id="btn-history-export-csv" style="white-space: nowrap; height: 38px; display: inline-flex; align-items: center; gap: 6px;">
          📥 Export CSV
        </button>
      </section>

      <!-- TABLE -->
      <div class="dash-table-wrap">
        <table class="dash-table" aria-label="Emergency Analysis Records">
          <thead>
            <tr>
              <th scope="col">Date / Time</th>
              <th scope="col">Urgency Badge</th>
              <th scope="col">Situation Summary</th>
              <th scope="col">Verification</th>
              <th scope="col">Confidence</th>
              <th scope="col" style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${paginated.items.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--dash-text-muted);">
                  No case analyses match your search and filter criteria.
                </td>
              </tr>
            ` : paginated.items.map(item => {
              const dateFormatted = new Date(item.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const confPercent = Math.round((item.confidence_score <= 1.0 ? item.confidence_score * 100 : item.confidence_score));
              const urgencyClass = `badge-urgency-${item.urgency_level.toLowerCase()}`;
              const urgencyIcon = item.urgency_level === 'CRITICAL' ? '🚨'
                : item.urgency_level === 'HIGH' ? '⚠️'
                : item.urgency_level === 'MEDIUM' ? '🟡' : '🟢';

              return `
                <tr>
                  <td style="white-space: nowrap; font-family: 'JetBrains Mono', monospace; font-size: 11.5px;">
                    ${dateFormatted}
                  </td>
                  <td>
                    <span class="badge-urgency ${urgencyClass}">
                      <span aria-hidden="true">${urgencyIcon}</span>
                      <span>${escapeHtml(item.urgency_level)}</span>
                    </span>
                    ${item.isSample ? `<span class="badge-sample">Sample data</span>` : ''}
                  </td>
                  <td>
                    <div style="font-weight: 500; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${escapeHtml(item.situation_summary)}
                    </div>
                    ${item.patient_name ? `<div style="font-size: 11px; color: var(--dash-text-muted); font-family: 'JetBrains Mono', monospace;">Patient: ${escapeHtml(item.patient_name)}</div>` : ''}
                  </td>
                  <td>
                    <span class="badge-verified">
                      ${item.verification?.status === 'VERIFIED' ? '🛡️ Verified' : '🔍 Review'}
                    </span>
                  </td>
                  <td style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">
                    ${confPercent}%
                  </td>
                  <td style="text-align: right;">
                    <button type="button" class="dash-btn-sm dash-btn-outline btn-view-analysis" data-id="${item.id}" aria-label="View protocol for analysis ${item.id}">
                      View Protocol
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- PAGINATION CONTROLS -->
        <div class="dash-pagination">
          <div>
            Showing <strong>${paginated.items.length > 0 ? (paginated.page - 1) * paginated.pageSize + 1 : 0}</strong> - <strong>${Math.min(paginated.page * paginated.pageSize, paginated.totalCount)}</strong> of <strong>${paginated.totalCount}</strong> cases
          </div>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="dash-page-btn" id="btn-page-prev" ${paginated.page <= 1 ? 'disabled' : ''}>
              &larr; Previous
            </button>
            <span style="display: inline-flex; align-items: center; padding: 0 8px;">
              Page ${paginated.page} of ${paginated.totalPages}
            </span>
            <button type="button" class="dash-page-btn" id="btn-page-next" ${paginated.page >= paginated.totalPages ? 'disabled' : ''}>
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderProfilesView({ profiles, activeProfile }) {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="font-size: 13.5px; color: var(--dash-text-muted);">
            Manage clinical baselines for family members. Selecting a profile injects known allergies and prescriptions directly into the triage safety engine.
          </div>
        </div>
        <button type="button" class="dash-btn dash-btn-primary" id="btn-add-profile">
          + Add Family Profile
        </button>
      </div>

      <div class="dash-grid-cards">
        ${profiles.length === 0 ? `
          <div class="dash-card" style="grid-column: 1 / -1; text-align: center; padding: 48px;">
            <p style="color: var(--dash-text-muted); margin-bottom: 16px;">No family patient profiles registered yet.</p>
            <button type="button" class="dash-btn dash-btn-outline" id="btn-add-profile-empty">+ Create First Profile</button>
          </div>
        ` : profiles.map(p => {
          const isActive = activeProfile && activeProfile.id === p.id;
          return `
            <div class="dash-item-card ${isActive ? 'active-profile-card' : ''}" data-profile-id="${p.id}">
              ${isActive ? `<span class="active-profile-tag">Active Context</span>` : ''}
              <div>
                <div class="dash-item-header">
                  <h3 class="dash-item-title">${escapeHtml(p.name)}</h3>
                  <div class="dash-item-sub">AGE: ${p.age || 'Unknown'} YRS${p.bloodGroup ? ` • BLOOD: <strong style="color: var(--dash-pigment);">${escapeHtml(p.bloodGroup)}</strong>` : ''}</div>
                </div>

                <div class="dash-item-body">
                  <div style="margin-bottom: 8px;">
                    <strong style="font-size: 11px; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; color: var(--dash-pigment);">Known Allergies:</strong>
                    <div class="dash-chip-row">
                      ${p.allergies ? p.allergies.split(',').map(a => `<span class="dash-chip dash-chip-alert">${escapeHtml(a.trim())}</span>`).join('') : '<span style="color: var(--dash-text-muted); font-size: 12px;">None reported</span>'}
                    </div>
                  </div>

                  <div style="margin-bottom: 8px;">
                    <strong style="font-size: 11px; text-transform: uppercase; font-family: 'JetBrains Mono', monospace; color: var(--dash-teal);">Current Medications:</strong>
                    <div class="dash-chip-row">
                      ${p.medications ? p.medications.split(',').map(m => `<span class="dash-chip">${escapeHtml(m.trim())}</span>`).join('') : '<span style="color: var(--dash-text-muted); font-size: 12px;">None</span>'}
                    </div>
                  </div>

                  ${p.notes ? `
                    <div style="margin-top: 8px; font-size: 12px; color: var(--dash-text-muted);">
                      <em>${escapeHtml(p.notes)}</em>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="dash-item-actions">
                <button type="button" class="dash-btn-sm ${isActive ? 'dash-btn-primary' : 'dash-btn-outline'} btn-toggle-active-profile" data-id="${p.id}">
                  ${isActive ? '✓ Active Context' : 'Select for Analysis'}
                </button>
                <button type="button" class="dash-btn-sm dash-btn-outline btn-view-id-card" data-id="${p.id}" title="View Emergency Medical ID Card">
                  🪪 Medical ID
                </button>
                <button type="button" class="dash-btn-sm dash-btn-outline btn-edit-profile" data-id="${p.id}">
                  Edit
                </button>
                <button type="button" class="dash-btn-sm dash-btn-outline btn-delete-profile" data-id="${p.id}" style="color: var(--dash-pigment);" aria-label="Delete profile ${p.name}">
                  Delete
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderContactsView({ contacts, analyses }) {
    const latestAnalysis = analyses[0] || null;

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
        <div style="font-size: 13.5px; color: var(--dash-text-muted);">
          Emergency contacts with instant prefilled WhatsApp SOS links and telephone dialing.
        </div>
        <button type="button" class="dash-btn dash-btn-primary" id="btn-add-contact">
          + Add Emergency Contact
        </button>
      </div>

      <div class="dash-grid-cards">
        ${contacts.length === 0 ? `
          <div class="dash-card" style="grid-column: 1 / -1; text-align: center; padding: 48px;">
            <p style="color: var(--dash-text-muted); margin-bottom: 16px;">No emergency contacts configured yet.</p>
            <button type="button" class="dash-btn dash-btn-outline" id="btn-add-contact-empty">+ Add Contact</button>
          </div>
        ` : contacts.map(c => {
          const waUrl = formatWhatsAppShareUrl(c, latestAnalysis);
          return `
            <div class="dash-item-card">
              <div>
                <div class="dash-item-header">
                  <h3 class="dash-item-title">${escapeHtml(c.name)}</h3>
                  <div class="dash-item-sub">${escapeHtml(c.relationship)}</div>
                </div>

                <div class="dash-item-body">
                  <div style="font-family: 'JetBrains Mono', monospace; font-size: 15px; font-weight: 600; margin-bottom: 6px;">
                    ${escapeHtml(c.phone)}
                  </div>
                  ${c.notifyOnCritical ? `
                    <div style="font-size: 11px; color: var(--dash-pigment); font-family: 'JetBrains Mono', monospace;">
                      🚨 Priority Critical Broadcast Enabled
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="dash-item-actions">
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="dash-btn-sm dash-btn-wa">
                  💬 WhatsApp SOS
                </a>
                <a href="tel:${c.phone.replace(/[^0-9]/g, '')}" class="dash-btn-sm dash-btn-outline">
                  📞 Call
                </a>
                <button type="button" class="dash-btn-sm dash-btn-outline btn-edit-contact" data-id="${c.id}">
                  Edit
                </button>
                <button type="button" class="dash-btn-sm dash-btn-outline btn-delete-contact" data-id="${c.id}" style="color: var(--dash-pigment);" aria-label="Delete contact ${c.name}">
                  Delete
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderSettingsView({ settings }) {
    return `
      <div class="dash-card" style="max-width: 680px;">
        <div class="settings-group">
          <div class="settings-label">Language & Regional Dialect</div>
          <div class="settings-desc">Choose primary display and speech synthesis voice output.</div>
          <select class="settings-select" id="setting-language" aria-label="Language">
            <option value="en-IN" ${settings.language === 'en-IN' ? 'selected' : ''}>English (India) — en-IN</option>
            <option value="hi-IN" ${settings.language === 'hi-IN' ? 'selected' : ''}>Hindi (हिन्दी) — hi-IN</option>
          </select>
        </div>

        <div class="settings-group">
          <div class="settings-label">Typography & Text Scale</div>
          <div class="settings-desc">Adjust baseline text readability for high-stress triage visibility.</div>
          <select class="settings-select" id="setting-text-size" aria-label="Text scale">
            <option value="standard" ${settings.textSize === 'standard' ? 'selected' : ''}>Standard (100%)</option>
            <option value="large" ${settings.textSize === 'large' ? 'selected' : ''}>Large (115% — Enhanced Readability)</option>
            <option value="xlarge" ${settings.textSize === 'xlarge' ? 'selected' : ''}>Extra Large (125% — High Accessibility)</option>
          </select>
        </div>

        <div class="settings-group">
          <div class="settings-label">Motion & Kinematics</div>
          <div class="settings-desc">Control interface animations and 3D visualizer rotation speed.</div>
          <select class="settings-select" id="setting-reduced-motion" aria-label="Motion preference">
            <option value="system" ${settings.reducedMotion === 'system' ? 'selected' : ''}>Follow System Preference</option>
            <option value="reduced" ${settings.reducedMotion === 'reduced' ? 'selected' : ''}>Reduced Motion (Static, No Parallax)</option>
            <option value="normal" ${settings.reducedMotion === 'normal' ? 'selected' : ''}>Full Dynamic Animations</option>
          </select>
        </div>

        <div class="settings-group" style="border-bottom: none;">
          <div class="settings-label">Data Portability & Right to Erasure</div>
          <div class="settings-desc">Download an encrypted or clean JSON backup of your records or wipe all data.</div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button type="button" class="dash-btn dash-btn-outline" id="btn-export-data">
              📥 Export My Data (JSON)
            </button>
            <button type="button" class="dash-btn dash-btn-outline" id="btn-delete-data" style="color: var(--dash-pigment); border-color: #fca5a5;">
              🗑️ Delete My Data
            </button>
          </div>
        </div>

        <!-- MANDATORY DISCLAIMER NOTE -->
        <div class="prototype-notice-box" role="note">
          <strong>Prototype Notice:</strong> Data is stored locally for demonstration and is not production-grade medical data storage.
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     EVENT LISTENERS & INTERACTIVE HANDLERS
     ========================================================================== */

  function attachEventListeners({ analyses, profiles, contacts, settings, activeProfile, userId }) {
    // 1. Sidebar tab switching
    const tabButtons = mountContainer.querySelectorAll('[data-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        historyPage = 1; // reset page on tab switch
        render();
      });
    });

    // 2. Mobile sidebar drawer toggle
    const mobileToggle = mountContainer.querySelector('#btn-mobile-sidebar-toggle');
    const sidebar = mountContainer.querySelector('#dash-sidebar');
    if (mobileToggle && sidebar) {
      mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    function playBeep() {
      if (!cprSoundEnabled) return;
      try {
        if (!audioCtx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
        if (audioCtx) {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.07);
        }
      } catch {
        // Audio context blocked or unsupported
      }
    }

    function stepCpr() {
      cprCompressions++;
      playBeep();
      updateCprDom();
    }

    function updateCprDom() {
      const countEl = mountContainer.querySelector('#cpr-count-val');
      const promptEl = mountContainer.querySelector('#cpr-prompt-text');
      const bannerEl = mountContainer.querySelector('#cpr-breath-banner');
      const visualEl = mountContainer.querySelector('#cpr-pulse-visual');
      const btnToggle = mountContainer.querySelector('#btn-toggle-cpr');

      if (!countEl) return;
      const status = calculateCprCycle(cprCompressions);
      countEl.textContent = status.totalCompressions;
      if (promptEl) promptEl.textContent = status.prompt;
      if (bannerEl) bannerEl.style.display = status.isRescueBreaths ? 'block' : 'none';
      if (visualEl) {
        if (cprRunning) visualEl.classList.add('pulsing');
        else visualEl.classList.remove('pulsing');
      }
      if (btnToggle) {
        btnToggle.textContent = cprRunning ? '⏹ Stop Cadence' : '▶ Start Metronome';
        btnToggle.className = `dash-btn-sm ${cprRunning ? 'dash-btn-sos' : 'dash-btn-primary'}`;
      }
    }

    function startCpr() {
      cprRunning = true;
      const intervalMs = Math.round(60000 / cprBpm);
      stepCpr();
      clearInterval(cprTimerId);
      cprTimerId = setInterval(stepCpr, intervalMs);
      updateCprDom();
    }

    function stopCpr() {
      cprRunning = false;
      clearInterval(cprTimerId);
      cprTimerId = null;
      updateCprDom();
    }

    function toggleStopwatch() {
      if (stopwatchRunning) {
        stopwatchRunning = false;
        clearInterval(stopwatchTimerId);
        stopwatchTimerId = null;
      } else {
        stopwatchRunning = true;
        stopwatchTimerId = setInterval(() => {
          stopwatchSeconds++;
          const disp = mountContainer.querySelector('#stopwatch-display');
          if (disp) disp.textContent = formatStopwatchTime(stopwatchSeconds);
        }, 1000);
      }
      const btn = mountContainer.querySelector('#btn-toggle-stopwatch');
      if (btn) btn.textContent = stopwatchRunning ? '⏸ Pause' : '▶ Start Timer';
    }

    // 3. Back to terminal / New Analysis buttons
    const btnBack = mountContainer.querySelector('#btn-back-to-terminal');
    const btnNewTop = mountContainer.querySelector('#btn-topbar-new-analysis');
    const btnNewOverview = mountContainer.querySelector('#btn-overview-new-analysis');

    const handleJumpToTriage = () => {
      onNavigateToTriage(activeProfile);
    };

    if (btnBack) btnBack.addEventListener('click', handleJumpToTriage);
    if (btnNewTop) btnNewTop.addEventListener('click', handleJumpToTriage);
    if (btnNewOverview) btnNewOverview.addEventListener('click', handleJumpToTriage);

    // Emergency Broadcast SOS
    const btnBroadcastTop = mountContainer.querySelector('#btn-topbar-broadcast-sos');
    const btnBroadcastOverview = mountContainer.querySelector('#btn-overview-broadcast-sos');
    const handleBroadcastSos = () => {
      openSosBroadcastModal(contacts, analyses[0] || null, activeProfile);
    };
    if (btnBroadcastTop) btnBroadcastTop.addEventListener('click', handleBroadcastSos);
    if (btnBroadcastOverview) btnBroadcastOverview.addEventListener('click', handleBroadcastSos);

    // CPR Metronome & Tourniquet Controls
    const btnToggleCpr = mountContainer.querySelector('#btn-toggle-cpr');
    const btnResetCpr = mountContainer.querySelector('#btn-reset-cpr');
    const btnSoundCpr = mountContainer.querySelector('#btn-toggle-cpr-sound');
    const bpmButtons = mountContainer.querySelectorAll('.btn-cpr-bpm');

    if (btnToggleCpr) {
      btnToggleCpr.addEventListener('click', () => {
        if (cprRunning) stopCpr();
        else startCpr();
      });
    }

    if (btnResetCpr) {
      btnResetCpr.addEventListener('click', () => {
        stopCpr();
        cprCompressions = 0;
        updateCprDom();
      });
    }

    if (btnSoundCpr) {
      btnSoundCpr.addEventListener('click', () => {
        cprSoundEnabled = !cprSoundEnabled;
        btnSoundCpr.textContent = cprSoundEnabled ? '🔊 Sound On' : '🔇 Muted';
      });
    }

    bpmButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        cprBpm = Number(btn.getAttribute('data-bpm')) || 110;
        bpmButtons.forEach(b => {
          b.classList.remove('dash-btn-primary');
          b.classList.add('dash-btn-outline');
        });
        btn.classList.remove('dash-btn-outline');
        btn.classList.add('dash-btn-primary');
        if (cprRunning) {
          stopCpr();
          startCpr();
        }
      });
    });

    const btnToggleStopwatch = mountContainer.querySelector('#btn-toggle-stopwatch');
    const btnResetStopwatch = mountContainer.querySelector('#btn-reset-stopwatch');

    if (btnToggleStopwatch) {
      btnToggleStopwatch.addEventListener('click', toggleStopwatch);
    }

    if (btnResetStopwatch) {
      btnResetStopwatch.addEventListener('click', () => {
        if (stopwatchRunning) toggleStopwatch();
        stopwatchSeconds = 0;
        const disp = mountContainer.querySelector('#stopwatch-display');
        if (disp) disp.textContent = formatStopwatchTime(0);
      });
    }

    // 4. Logout handler
    const btnLogout = mountContainer.querySelector('#btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        logoutUser();
        render();
      });
    }

    // 5. History Search & Filters
    const searchInput = mountContainer.querySelector('#history-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        historySearch = e.target.value;
        historyPage = 1;
        render();
        // Restore focus
        const nextInput = mountContainer.querySelector('#history-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    const urgencyPills = mountContainer.querySelectorAll('.filter-pill');
    urgencyPills.forEach(pill => {
      pill.addEventListener('click', () => {
        historyUrgency = pill.getAttribute('data-urgency');
        historyPage = 1;
        render();
      });
    });

    const sortSelect = mountContainer.querySelector('#history-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'date-desc') { historySort = 'date'; historySortOrder = 'desc'; }
        else if (val === 'date-asc') { historySort = 'date'; historySortOrder = 'asc'; }
        else if (val === 'urgency-desc') { historySort = 'urgency'; historySortOrder = 'desc'; }
        else if (val === 'confidence-desc') { historySort = 'confidence'; historySortOrder = 'desc'; }
        historyPage = 1;
        render();
      });
    }

    const btnHistoryCsv = mountContainer.querySelector('#btn-history-export-csv');
    if (btnHistoryCsv) {
      btnHistoryCsv.addEventListener('click', () => {
        const filtered = filterAnalyses(analyses, {
          search: historySearch,
          urgency: historyUrgency
        });
        const csv = exportAnalysesToCsv(filtered);
        downloadFile(`lifebridge_cases_${Date.now()}.csv`, csv, 'text/csv');
      });
    }

    // Pagination buttons
    const btnPrev = mountContainer.querySelector('#btn-page-prev');
    const btnNext = mountContainer.querySelector('#btn-page-next');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (historyPage > 1) {
          historyPage--;
          render();
        }
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        historyPage++;
        render();
      });
    }

    // View Analysis Protocol modal
    const viewButtons = mountContainer.querySelectorAll('.btn-view-analysis');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const record = analyses.find(a => a.id === id);
        if (record) {
          openAnalysisModal(record);
        }
      });
    });

    // 6. Patient Profiles CRUD Handlers
    const btnAddProfile = mountContainer.querySelector('#btn-add-profile');
    const btnAddProfileEmpty = mountContainer.querySelector('#btn-add-profile-empty');
    if (btnAddProfile) btnAddProfile.addEventListener('click', () => openProfileModal(null, userId));
    if (btnAddProfileEmpty) btnAddProfileEmpty.addEventListener('click', () => openProfileModal(null, userId));

    const editProfileBtns = mountContainer.querySelectorAll('.btn-edit-profile');
    editProfileBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = profiles.find(item => item.id === id);
        if (p) openProfileModal(p, userId);
      });
    });

    const viewIdBtns = mountContainer.querySelectorAll('.btn-view-id-card');
    viewIdBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = profiles.find(item => item.id === id);
        if (p) openMedicalIdModal(p, contacts);
      });
    });

    const deleteProfileBtns = mountContainer.querySelectorAll('.btn-delete-profile');
    deleteProfileBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = profiles.find(item => item.id === id);
        if (p) {
          openConfirmModal({
            title: 'Delete Patient Profile',
            message: `Are you sure you want to permanently delete the profile for "${p.name}"? This action cannot be undone.`,
            confirmLabel: 'Delete Profile',
            onConfirm: () => {
              deleteProfile(userId, id);
              render();
            }
          });
        }
      });
    });

    const toggleActiveProfileBtns = mountContainer.querySelectorAll('.btn-toggle-active-profile');
    toggleActiveProfileBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const p = profiles.find(item => item.id === id);
        if (activeProfile && activeProfile.id === id) {
          setActiveProfile(null);
        } else {
          setActiveProfile(p);
        }
        render();
      });
    });

    // 7. Emergency Contacts CRUD Handlers
    const btnAddContact = mountContainer.querySelector('#btn-add-contact');
    const btnAddContactEmpty = mountContainer.querySelector('#btn-add-contact-empty');
    if (btnAddContact) btnAddContact.addEventListener('click', () => openContactModal(null, userId));
    if (btnAddContactEmpty) btnAddContactEmpty.addEventListener('click', () => openContactModal(null, userId));

    const editContactBtns = mountContainer.querySelectorAll('.btn-edit-contact');
    editContactBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const c = contacts.find(item => item.id === id);
        if (c) openContactModal(c, userId);
      });
    });

    const deleteContactBtns = mountContainer.querySelectorAll('.btn-delete-contact');
    deleteContactBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const c = contacts.find(item => item.id === id);
        if (c) {
          openConfirmModal({
            title: 'Delete Emergency Contact',
            message: `Are you sure you want to delete emergency contact "${c.name}" (${c.phone})?`,
            confirmLabel: 'Delete Contact',
            onConfirm: () => {
              deleteContact(userId, id);
              render();
            }
          });
        }
      });
    });

    // 8. Settings Handlers
    const selLanguage = mountContainer.querySelector('#setting-language');
    if (selLanguage) {
      selLanguage.addEventListener('change', (e) => {
        saveSettingsForUser(userId, { language: e.target.value });
      });
    }

    const selTextSize = mountContainer.querySelector('#setting-text-size');
    if (selTextSize) {
      selTextSize.addEventListener('change', (e) => {
        const size = e.target.value;
        saveSettingsForUser(userId, { textSize: size });
        applyTextSize(size);
      });
    }

    const selMotion = mountContainer.querySelector('#setting-reduced-motion');
    if (selMotion) {
      selMotion.addEventListener('change', (e) => {
        saveSettingsForUser(userId, { reducedMotion: e.target.value });
      });
    }

    const btnExport = mountContainer.querySelector('#btn-export-data');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const json = exportUserDataJson(userId);
        downloadFile(`lifebridge_export_${userId}_${Date.now()}.json`, json, 'application/json');
      });
    }

    const btnDeleteAll = mountContainer.querySelector('#btn-delete-data');
    if (btnDeleteAll) {
      btnDeleteAll.addEventListener('click', () => {
        openConfirmModal({
          title: 'Wipe All User Data',
          message: 'Are you sure you want to delete all analyses, patient profiles, and contacts stored locally? This cannot be undone.',
          confirmLabel: 'Wipe All Data',
          onConfirm: () => {
            deleteUserData(userId);
            render();
          }
        });
      });
    }
  }

  /* ==========================================================================
     MODAL UTILITIES (DETAIL, FORMS, CONFIRMATION)
     ========================================================================== */

  const modalRoot = () => mountContainer.querySelector('#dash-modal-root');

  function openAnalysisModal(record) {
    const root = modalRoot();
    if (!root) return;

    const urgencyClass = `badge-urgency-${record.urgency_level.toLowerCase()}`;
    const urgencyIcon = record.urgency_level === 'CRITICAL' ? '🚨'
      : record.urgency_level === 'HIGH' ? '⚠️'
      : record.urgency_level === 'MEDIUM' ? '🟡' : '🟢';

    root.innerHTML = `
      <div class="dash-modal-backdrop" id="modal-backdrop">
        <div class="dash-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-analysis-title">
          <div class="dash-modal-header">
            <div>
              <div class="dash-stat-label">CLINICAL TRIAGE PROTOCOL // REF. ${record.id}</div>
              <h2 class="dash-modal-title" id="modal-analysis-title">
                ${escapeHtml(record.situation_summary)}
              </h2>
            </div>
            <button type="button" class="dash-btn-logout" id="btn-modal-close" aria-label="Close modal">✕</button>
          </div>

          <div class="dash-modal-body">
            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 20px;">
              <span class="badge-urgency ${urgencyClass}">
                ${urgencyIcon} ${escapeHtml(record.urgency_level)}
              </span>
              <span class="badge-verified">
                🛡️ ${record.verification?.status || 'VERIFIED'}
              </span>
              <span style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--dash-text-muted);">
                ${new Date(record.timestamp).toLocaleString()}
              </span>
            </div>

            <!-- RECOMMENDED ACTIONS -->
            <div style="margin-bottom: 24px;">
              <div class="form-label" style="color: var(--dash-pigment);">Priority Action Sequence</div>
              <ol style="margin: 8px 0 0; padding-left: 20px; font-size: 13.5px; line-height: 1.6;">
                ${record.recommended_actions.map(a => `
                  <li style="margin-bottom: 8px;">
                    <strong>${escapeHtml(a.action)}</strong>
                    <div style="font-size: 12px; color: var(--dash-text-muted);">
                      Reason: ${escapeHtml(a.reason)} (${escapeHtml(a.time_sensitivity)})
                    </div>
                  </li>
                `).join('')}
              </ol>
            </div>

            <!-- EXTRACTED CLINICAL FACTS -->
            ${record.extracted_facts?.length > 0 ? `
              <div style="margin-bottom: 24px;">
                <div class="form-label">Corroborated Facts</div>
                <div class="dash-chip-row">
                  ${record.extracted_facts.map(f => `
                    <span class="dash-chip">
                      <strong>[${escapeHtml(f.category)}]:</strong> ${escapeHtml(f.fact)}
                    </span>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- 108 EMS OPERATOR SCRIPT -->
            <div style="background-color: var(--dash-surface-subtle); border: 1px solid var(--dash-border); border-left: 3px solid var(--dash-pigment); padding: 16px; border-radius: 3px;">
              <div class="form-label" style="color: var(--dash-pigment);">Verbal Script for 108/112 Operator</div>
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 12.5px; line-height: 1.5; color: #1f1e1c;" id="text-108-script">
                ${escapeHtml(record.call_108_script)}
              </div>
            </div>
          </div>

          <div class="dash-modal-footer">
            <button type="button" class="dash-btn dash-btn-outline" id="btn-print-handover">
              🖨️ Print Handover
            </button>
            <button type="button" class="dash-btn dash-btn-outline" id="btn-copy-handover">
              📋 Copy Summary
            </button>
            <button type="button" class="dash-btn dash-btn-outline" id="btn-copy-script">
              Copy 108 Script
            </button>
            <a href="tel:108" class="dash-btn dash-btn-sos">
              Call 108 Now
            </a>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#btn-modal-close').addEventListener('click', closeModal);
    root.querySelector('#modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });

    root.querySelector('#btn-copy-script').addEventListener('click', () => {
      navigator.clipboard.writeText(record.call_108_script);
      const btn = root.querySelector('#btn-copy-script');
      btn.textContent = '✓ Copied!';
      setTimeout(() => { btn.textContent = 'Copy 108 Script'; }, 2000);
    });

    const btnPrint = root.querySelector('#btn-print-handover');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    const btnCopyNote = root.querySelector('#btn-copy-handover');
    if (btnCopyNote) {
      btnCopyNote.addEventListener('click', () => {
        const text = formatMedicalHandoverSummary(record, activeProfile, contacts);
        navigator.clipboard.writeText(text);
        btnCopyNote.textContent = '✓ Note Copied!';
        setTimeout(() => { btnCopyNote.textContent = '📋 Copy Summary'; }, 2000);
      });
    }
  }

  function openProfileModal(existingProfile, userId) {
    const root = modalRoot();
    if (!root) return;

    const isEdit = Boolean(existingProfile);

    root.innerHTML = `
      <div class="dash-modal-backdrop" id="modal-backdrop">
        <div class="dash-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-profile-title">
          <div class="dash-modal-header">
            <h2 class="dash-modal-title" id="modal-profile-title">
              ${isEdit ? 'Edit Family Profile' : 'New Family Patient Profile'}
            </h2>
            <button type="button" class="dash-btn-logout" id="btn-modal-close" aria-label="Close modal">✕</button>
          </div>

          <form id="form-profile" class="dash-modal-body">
            <div class="form-group">
              <label class="form-label" for="prof-name">Full Name *</label>
              <input type="text" id="prof-name" class="form-control" required value="${isEdit ? escapeHtml(existingProfile.name) : ''}" placeholder="e.g. Meera Patel" />
            </div>

            <div class="form-group">
              <label class="form-label" for="prof-age">Age (Years)</label>
              <input type="number" id="prof-age" class="form-control" min="0" max="120" value="${isEdit ? existingProfile.age : ''}" placeholder="e.g. 4" />
            </div>

            <div class="form-group">
              <label class="form-label" for="prof-blood">Blood Group (e.g. O+, B+, A-, AB+)</label>
              <input type="text" id="prof-blood" class="form-control" value="${isEdit ? escapeHtml(existingProfile.bloodGroup || '') : ''}" placeholder="e.g. B+" />
            </div>

            <div class="form-group">
              <label class="form-label" for="prof-allergies">Known Allergies (comma separated)</label>
              <input type="text" id="prof-allergies" class="form-control" value="${isEdit ? escapeHtml(existingProfile.allergies) : ''}" placeholder="e.g. Aspirin, Penicillin, Peanuts" />
            </div>

            <div class="form-group">
              <label class="form-label" for="prof-medications">Current Prescriptions / Medications</label>
              <input type="text" id="prof-medications" class="form-control" value="${isEdit ? escapeHtml(existingProfile.medications) : ''}" placeholder="e.g. Telmisartan 40mg, Inhaler" />
            </div>

            <div class="form-group">
              <label class="form-label" for="prof-notes">Medical Background / Relevant Conditions</label>
              <textarea id="prof-notes" class="form-control" placeholder="e.g. Diagnosed hypertension, pediatric febrile seizures">${isEdit ? escapeHtml(existingProfile.notes) : ''}</textarea>
            </div>

            <div class="dash-modal-footer" style="padding: 16px 0 0;">
              <button type="button" class="dash-btn dash-btn-outline" id="btn-form-cancel">Cancel</button>
              <button type="submit" class="dash-btn dash-btn-primary">
                ${isEdit ? 'Save Changes' : 'Create Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    root.querySelector('#btn-modal-close').addEventListener('click', closeModal);
    root.querySelector('#btn-form-cancel').addEventListener('click', closeModal);

    root.querySelector('#form-profile').addEventListener('submit', (e) => {
      e.preventDefault();
      const profileData = {
        id: isEdit ? existingProfile.id : undefined,
        name: root.querySelector('#prof-name').value,
        age: root.querySelector('#prof-age').value,
        bloodGroup: root.querySelector('#prof-blood').value,
        allergies: root.querySelector('#prof-allergies').value,
        medications: root.querySelector('#prof-medications').value,
        notes: root.querySelector('#prof-notes').value
      };

      saveProfile(userId, profileData);
      closeModal();
      render();
    });
  }

  function openSosBroadcastModal(contacts, latestAnalysis, activeProfile) {
    const root = modalRoot();
    if (!root) return;

    const smsText = formatEmergencyBroadcastSms(contacts, latestAnalysis, activeProfile);

    root.innerHTML = `
      <div class="dash-modal-backdrop" id="modal-backdrop">
        <div class="dash-modal-panel" role="dialog" aria-modal="true" style="max-width: 580px;">
          <div class="dash-modal-header">
            <div>
              <div class="dash-stat-label" style="color: var(--dash-pigment);">EMERGENCY DISPATCH // PROTOCOL 108</div>
              <h2 class="dash-modal-title" style="color: var(--dash-pigment);">Broadcast Emergency SOS</h2>
            </div>
            <button type="button" class="dash-btn-logout" id="btn-modal-close" aria-label="Close modal">✕</button>
          </div>

          <div class="dash-modal-body">
            <div style="background-color: var(--dash-pigment-subtle); border-left: 3px solid var(--dash-pigment); padding: 12px 16px; border-radius: 3px; margin-bottom: 20px;">
              <div style="font-weight: 600; font-size: 13.5px; color: var(--dash-pigment);">
                Active Patient: ${escapeHtml(activeProfile?.name || 'Unnamed / Lay Bystander')}
              </div>
              <div style="font-size: 12px; color: var(--dash-text-muted); margin-top: 2px;">
                ${latestAnalysis ? escapeHtml(latestAnalysis.situation_summary) : 'Urgent medical triage assistance requested'}
              </div>
            </div>

            <div class="form-label" style="margin-bottom: 10px;">Dispatch to Emergency Contacts (${contacts.length}):</div>
            ${contacts.length === 0 ? `
              <p style="color: var(--dash-text-muted); font-size: 13px;">No emergency contacts configured yet. Add contacts in the Emergency Contacts tab.</p>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                ${contacts.map(c => {
                  const waUrl = formatWhatsAppShareUrl(c, latestAnalysis);
                  return `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--dash-surface-subtle); border: 1px solid var(--dash-border); padding: 10px 14px; border-radius: 4px;">
                      <div>
                        <div style="font-weight: 600; font-size: 13.5px;">${escapeHtml(c.name)} <span style="font-size: 12px; color: var(--dash-text-muted); font-weight: normal;">(${escapeHtml(c.relationship)})</span></div>
                        <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--dash-text-muted);">${escapeHtml(c.phone)}</div>
                      </div>
                      <div style="display: flex; gap: 6px;">
                        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="dash-btn-sm dash-btn-wa">
                          💬 WhatsApp
                        </a>
                        <a href="tel:${c.phone.replace(/[^0-9]/g, '')}" class="dash-btn-sm dash-btn-outline">
                          📞 Call
                        </a>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}

            <div class="form-group">
              <label class="form-label">Pre-Formatted SMS Broadcast Text</label>
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; background: var(--dash-surface); border: 1px solid var(--dash-border); padding: 10px; border-radius: 3px; max-height: 90px; overflow-y: auto;">
                ${escapeHtml(smsText)}
              </div>
            </div>
          </div>

          <div class="dash-modal-footer">
            <button type="button" class="dash-btn dash-btn-outline" id="btn-copy-sms">
              📋 Copy SMS Text
            </button>
            <a href="tel:108" class="dash-btn dash-btn-sos">
              🚨 Call 108 Ambulance
            </a>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#btn-modal-close').addEventListener('click', closeModal);
    root.querySelector('#modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });

    const btnCopy = root.querySelector('#btn-copy-sms');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(smsText);
        btnCopy.textContent = '✓ Copied!';
        setTimeout(() => { btnCopy.textContent = '📋 Copy SMS Text'; }, 2000);
      });
    }
  }

  function openMedicalIdModal(profile, contacts) {
    const root = modalRoot();
    if (!root) return;

    root.innerHTML = `
      <div class="dash-modal-backdrop" id="modal-backdrop">
        <div class="dash-modal-panel" role="dialog" aria-modal="true" style="max-width: 500px;">
          <div class="dash-modal-header">
            <div class="medical-id-badge">EMERGENCY MEDICAL ID</div>
            <button type="button" class="dash-btn-logout" id="btn-modal-close" aria-label="Close modal">✕</button>
          </div>

          <div class="dash-modal-body">
            <div class="medical-id-card">
              <div class="medical-id-header">
                <div>
                  <h2 style="font-family: 'Fraunces', serif; font-size: 22px; margin: 0 0 4px; font-weight: 700;">
                    ${escapeHtml(profile.name)}
                  </h2>
                  <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--dash-text-muted);">
                    AGE: ${profile.age || 'Unknown'} YRS
                  </div>
                </div>
                <div class="medical-id-blood" title="Blood Group">
                  ${escapeHtml(profile.bloodGroup || 'O+')}
                </div>
              </div>

              <div style="margin-bottom: 14px;">
                <div class="form-label" style="color: var(--dash-pigment);">🚨 Critical Allergies & Contraindications:</div>
                <div class="dash-chip-row" style="margin-top: 4px;">
                  ${profile.allergies ? profile.allergies.split(',').map(a => `<span class="dash-chip dash-chip-alert" style="font-size: 12px; font-weight: 600;">${escapeHtml(a.trim())}</span>`).join('') : '<span style="font-size: 12px; color: var(--dash-text-muted);">No allergies recorded</span>'}
                </div>
              </div>

              <div style="margin-bottom: 14px;">
                <div class="form-label" style="color: var(--dash-teal);">Current Daily Prescriptions:</div>
                <div style="font-size: 13px; font-weight: 500; margin-top: 2px;">
                  ${escapeHtml(profile.medications || 'None recorded')}
                </div>
              </div>

              ${profile.notes ? `
                <div style="margin-bottom: 14px;">
                  <div class="form-label">Clinical Background:</div>
                  <div style="font-size: 12.5px; color: var(--dash-text-muted); font-style: italic;">
                    ${escapeHtml(profile.notes)}
                  </div>
                </div>
              ` : ''}

              <div style="border-top: 1px dashed var(--dash-border); padding-top: 12px; margin-top: 14px;">
                <div class="form-label">Primary Emergency Contact:</div>
                ${contacts && contacts.length > 0 ? `
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <div>
                      <strong>${escapeHtml(contacts[0].name)}</strong> (${escapeHtml(contacts[0].relationship)})
                    </div>
                    <a href="tel:${contacts[0].phone.replace(/[^0-9]/g, '')}" style="font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--dash-pigment);">
                      ${escapeHtml(contacts[0].phone)}
                    </a>
                  </div>
                ` : `
                  <div style="font-size: 12px; color: var(--dash-text-muted);">Dial 108 / 112 EMS</div>
                `}
              </div>
            </div>
          </div>

          <div class="dash-modal-footer">
            <button type="button" class="dash-btn dash-btn-outline" id="btn-print-id-card">
              🖨️ Print ID Card
            </button>
            <a href="tel:108" class="dash-btn dash-btn-sos">
              🚨 Dial 108
            </a>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#btn-modal-close').addEventListener('click', closeModal);
    root.querySelector('#modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });

    root.querySelector('#btn-print-id-card').addEventListener('click', () => {
      window.print();
    });
  }

  function openContactModal(existingContact, userId) {
    const root = modalRoot();
    if (!root) return;

    const isEdit = Boolean(existingContact);

    root.innerHTML = `
      <div class="dash-modal-backdrop" id="modal-backdrop">
        <div class="dash-modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-contact-title">
          <div class="dash-modal-header">
            <h2 class="dash-modal-title" id="modal-contact-title">
              ${isEdit ? 'Edit Emergency Contact' : 'New Emergency Contact'}
            </h2>
            <button type="button" class="dash-btn-logout" id="btn-modal-close" aria-label="Close modal">✕</button>
          </div>

          <form id="form-contact" class="dash-modal-body">
            <div class="form-group">
              <label class="form-label" for="contact-name">Contact / Doctor Name *</label>
              <input type="text" id="contact-name" class="form-control" required value="${isEdit ? escapeHtml(existingContact.name) : ''}" placeholder="e.g. Pooja Patel" />
            </div>

            <div class="form-group">
              <label class="form-label" for="contact-rel">Relationship</label>
              <input type="text" id="contact-rel" class="form-control" value="${isEdit ? escapeHtml(existingContact.relationship) : ''}" placeholder="e.g. Spouse, Family Physician, Neighbor" />
            </div>

            <div class="form-group">
              <label class="form-label" for="contact-phone">Phone / WhatsApp Number *</label>
              <input type="tel" id="contact-phone" class="form-control" required value="${isEdit ? escapeHtml(existingContact.phone) : ''}" placeholder="+919876543210" />
            </div>

            <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
              <input type="checkbox" id="contact-notify" ${isEdit && existingContact.notifyOnCritical ? 'checked' : ''} style="width: 18px; height: 18px;" />
              <label for="contact-notify" style="font-size: 13px; cursor: pointer;">
                Enable Priority Broadcast on Critical Urgency Cases
              </label>
            </div>

            <div class="dash-modal-footer" style="padding: 16px 0 0;">
              <button type="button" class="dash-btn dash-btn-outline" id="btn-form-cancel">Cancel</button>
              <button type="submit" class="dash-btn dash-btn-primary">
                ${isEdit ? 'Save Contact' : 'Add Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    root.querySelector('#btn-modal-close').addEventListener('click', closeModal);
    root.querySelector('#btn-form-cancel').addEventListener('click', closeModal);

    root.querySelector('#form-contact').addEventListener('submit', (e) => {
      e.preventDefault();
      const contactData = {
        id: isEdit ? existingContact.id : undefined,
        name: root.querySelector('#contact-name').value,
        relationship: root.querySelector('#contact-rel').value,
        phone: root.querySelector('#contact-phone').value,
        notifyOnCritical: root.querySelector('#contact-notify').checked
      };

      saveContact(userId, contactData);
      closeModal();
      render();
    });
  }

  function openConfirmModal({ title, message, confirmLabel, onConfirm }) {
    const root = modalRoot();
    if (!root) return;

    root.innerHTML = `
      <div class="dash-modal-backdrop" id="modal-backdrop">
        <div class="dash-modal-panel" role="dialog" aria-modal="true" style="max-width: 480px;">
          <div class="dash-modal-header">
            <h2 class="dash-modal-title" style="color: var(--dash-pigment);">${escapeHtml(title)}</h2>
            <button type="button" class="dash-btn-logout" id="btn-modal-close" aria-label="Close modal">✕</button>
          </div>
          <div class="dash-modal-body" style="font-size: 13.5px; line-height: 1.5;">
            ${escapeHtml(message)}
          </div>
          <div class="dash-modal-footer">
            <button type="button" class="dash-btn dash-btn-outline" id="btn-confirm-cancel">Cancel</button>
            <button type="button" class="dash-btn dash-btn-sos" id="btn-confirm-action">
              ${escapeHtml(confirmLabel)}
            </button>
          </div>
        </div>
      </div>
    `;

    root.querySelector('#btn-modal-close').addEventListener('click', closeModal);
    root.querySelector('#btn-confirm-cancel').addEventListener('click', closeModal);
    root.querySelector('#btn-confirm-action').addEventListener('click', () => {
      closeModal();
      onConfirm();
    });
  }

  function closeModal() {
    const root = modalRoot();
    if (root) root.innerHTML = '';
  }

  function applyTextSize(size) {
    if (size === 'large') {
      document.documentElement.style.fontSize = '18px';
    } else if (size === 'xlarge') {
      document.documentElement.style.fontSize = '20px';
    } else {
      document.documentElement.style.fontSize = '16px';
    }
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial render
  render();

  return {
    render,
    getActiveProfile,
    setActiveProfile
  };
}
