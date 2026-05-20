// app.js - uWaver (Web Serial Edition)

class UWaveApp {
    constructor() {
        this.modem = new uWavePort(9600);

        this.isConnected = false;
        this.isAutoMode = false;
        this.autoRequestLimit = 0;
        this.autoRequestCount = 0;
        this.autoCodeIdx = 0;
        this.autoCodes = [RC_CODES_Enum.RC_DPT_GET, RC_CODES_Enum.RC_TMP_GET, RC_CODES_Enum.RC_BAT_V_GET];
        this.maxLogEntries = 128;

        // Statistics
        this.rcStats = {};
        this.rcSuccessCount = 0;
        this.rcFailCount = 0;

        this._wireModemEvents();
        this._initAllListeners();
        this._initTabs();
        this._initLogToggle();
        this._initChannelSelects();
        this._initLangSwitch();
        this._updateUIState(false);
    }

    // ==================== Language ====================
    _initLangSwitch() {
        document.getElementById('langSelector').addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
            this._updateDynamicTexts();
        });
    }

    _updateDynamicTexts() {
        // Update status badge
        if (this.isConnected) {
            this._setConnectionBadge('connected');
        } else if (this.modem.isOpen) {
            this._setConnectionBadge('busy');
        } else {
            this._setConnectionBadge('disconnected');
        }

        // Update connect button
        const btnConnect = document.getElementById('btnConnect');
        if (!btnConnect.disabled) {
            btnConnect.textContent = I18n.translate('connect');
        }

        // Update status text
        const statusText = document.getElementById('connectStatusText');
        if (this.isConnected) {
            statusText.textContent = I18n.translate('device_connected');
        } else if (this.modem.isOpen) {
            statusText.textContent = I18n.translate('auto_connecting');
        } else {
            statusText.textContent = I18n.translate('device_not_selected');
        }

        // Update stats display
        this._updateStatsDisplay();

        // Update auto mode UI
        this._updateAutoUI(this.isAutoMode, this.autoRequestLimit);

        // Update packet size hint
        const ptData = document.getElementById('ptPacketData');
        if (ptData) {
            document.getElementById('ptPacketSizeHint').textContent =
                `${ptData.value.length} / 64 ${I18n.translate('bytes')}`;
        }
    }

    // ==================== Modem Events ====================
    _wireModemEvents() {
        this.modem.addEventListener('log', (e) => this._addMainLog(e.detail.message, 'info'));
        this.modem.addEventListener('error', (e) => this._addMainLog(e.detail.message, 'error'));

        this.modem.addEventListener('stateChanged', () => {
            const detected = this.modem.detected;
            const portOpen = this.modem.isOpen;
            const waiting = this.modem.isWaitingLocal || this.modem.isWaitingRemote;

            this.isConnected = detected;
            this._updateUIState(detected);

            const indicator = document.querySelector('.connect-indicator');
            const statusText = document.getElementById('connectStatusText');

            if (detected) {
                this._setConnectionBadge('connected');
                if (indicator) indicator.className = 'connect-indicator connected';
                if (statusText) statusText.textContent = I18n.translate('device_connected');
            } else if (portOpen) {
                this._setConnectionBadge('busy');
                if (indicator) indicator.className = 'connect-indicator disconnected';
                if (statusText) statusText.textContent = I18n.translate('auto_connecting');
            } else {
                this._setConnectionBadge('disconnected');
                if (indicator) indicator.className = 'connect-indicator disconnected';
                if (statusText) statusText.textContent = I18n.translate('device_not_selected');
            }

            this._setTabsEnabled(!waiting || detected);
        });

        this.modem.addEventListener('deviceInfoValidChanged', () => this._onDeviceInfo());
        this.modem.addEventListener('ambDataUpdated', (e) => this._onSensorData(e.detail));
        this.modem.addEventListener('ptcrolDataUpdated', (e) => this._onPTCROLData(e.detail));

        // Remote Control
        this.modem.addEventListener('ackReceived', (e) => {
            if (e.detail.errorID === LOC_ERR_Enum.LOC_ERR_NO_ERROR) {
                if (e.detail.sentenceID === ICs.IC_H2D_SETTINGS_WRITE) {
                    this._addMainLog(I18n.translate('msg_settings_saved'), 'success');
                } else if (e.detail.sentenceID === ICs.IC_H2D_PT_ITG) {
                    this._addPTLog(I18n.translate('msg_pt_request_sent'));
                }
            } else {
                this._addMainLog(`ACK error: ${e.detail.errorID}`, 'error');
            }
        });

        this.modem.addEventListener('rcResponseReceived', (e) => this._onRCResponse(e.detail));
        this.modem.addEventListener('rcTimeoutReceived', (e) => this._onRCTimeout(e.detail));
        this.modem.addEventListener('rcAsyncInReceived', (e) => this._onRCAsyncIn(e.detail));

        // Packet Mode
        this.modem.addEventListener('packetModeSettingsReceived', (e) => {
            document.getElementById('ptLocalAddr').value = e.detail.ptAddress;
            this._addPTLog(I18n.translate('msg_pt_settings_ok', e.detail.ptAddress, e.detail.isPTMode));
        });
        this.modem.addEventListener('packetTransferred', (e) =>
            this._addPTLog(I18n.translate('msg_pt_ok', e.detail.targetPtAddress, e.detail.triesTaken)));
        this.modem.addEventListener('packetTransferFailed', (e) =>
            this._addPTLog(I18n.translate('msg_pt_failed', e.detail.targetPtAddress, e.detail.triesTaken)));
        this.modem.addEventListener('packetReceived', (e) => {
            const text = new TextDecoder().decode(e.detail.dataPacket);
            this._addPTLog(`#${e.detail.targetPtAddress} >> "${text}"${!isNaN(e.detail.azimuth) ? `, az=${e.detail.azimuth.toFixed(1)}°` : ''}`);
        });
        this.modem.addEventListener('packetResponse', (e) => this._onPTResponse(e.detail));
        this.modem.addEventListener('packetRequestTimeout', (e) =>
            this._addPTLog(I18n.translate('msg_pt_timeout', e.detail.targetPtAddress, e.detail.dataId)));

        // AQPNG
        this.modem.addEventListener('aqpngSettingsReceived', (e) => this._onAQPNGSettings(e.detail));
    }

    // ==================== UI Init ====================
    _initAllListeners() {
        document.getElementById('btnConnect').addEventListener('click', () => this._connect());
        document.getElementById('btnDisconnect').addEventListener('click', () => this._disconnect());
        document.getElementById('btnQueryDeviceInfo').addEventListener('click', () => this._queryDeviceInfo());

        // Device Settings
        document.getElementById('btnDefaultSettings').addEventListener('click', () => this._defaultSettings());
        document.getElementById('btnApplySettings').addEventListener('click', () => this._applySettings());

        // Remote Requests
        document.getElementById('btnRCSend').addEventListener('click', () => this._sendRC());
        document.getElementById('btnAutoFull').addEventListener('click', () => this._toggleAuto(0));
        document.getElementById('btnAuto256').addEventListener('click', () => this._toggleAuto(256));
        document.getElementById('btnAuto128').addEventListener('click', () => this._toggleAuto(128));
        document.getElementById('btnClearStats').addEventListener('click', () => this._clearStats());
        document.getElementById('btnRCCopy').addEventListener('click', () => this._copyLog('rcLogContainer'));
        document.getElementById('btnRCClear').addEventListener('click', () => {
            document.getElementById('rcLogContainer').innerHTML = '';
            this._updateRCButtons();
        });

        // Packet Mode
        document.getElementById('btnPTQuerySettings').addEventListener('click', () => this._ptQuerySettings());
        document.getElementById('btnPTApplySettings').addEventListener('click', () => this._ptApplySettings());
        document.getElementById('btnPTReqSend').addEventListener('click', () => this._ptReqSend());
        document.getElementById('btnPTPacketSend').addEventListener('click', () => this._ptPacketSend());
        document.getElementById('btnPTPacketAbort').addEventListener('click', () => this._ptPacketAbort());
        document.getElementById('btnPTCopy').addEventListener('click', () => this._copyLog('ptLogContainer'));
        document.getElementById('btnPTClear').addEventListener('click', () => {
            document.getElementById('ptLogContainer').innerHTML = '';
            this._updatePTButtons();
        });
        document.getElementById('ptPacketData').addEventListener('input', (e) => {
            document.getElementById('ptPacketSizeHint').textContent =
                `${e.target.value.length} / 64 ${I18n.translate('bytes')}`;
            document.getElementById('btnPTPacketSend').disabled = e.target.value.length === 0 || !this.isConnected;
        });

        // Local Sensors
        document.getElementById('btnLS1Apply').addEventListener('click', () => this._ls1Apply());
        document.getElementById('btnLS2Apply').addEventListener('click', () => this._ls2Apply());

        // AQPNG
        document.getElementById('btnAqpngQuery').addEventListener('click', () => this.modem.queryAQPNGSettings());
        document.getElementById('btnAqpngDefaults').addEventListener('click', () => this._aqpngDefaults());
        document.getElementById('btnAqpngApply').addEventListener('click', () => this._aqpngApply());
        document.getElementById('aqpngMode').addEventListener('change', () => this._aqpngModeChanged());
        document.getElementById('aqpngIsPTMode').addEventListener('change', () => this._aqpngModeChanged());

        // Logs
        document.getElementById('rcAutoscroll').addEventListener('change', () => {
            if (document.getElementById('rcAutoscroll').checked) {
                const c = document.getElementById('rcLogContainer');
                c.scrollTop = c.scrollHeight;
            }
        });
        document.getElementById('rcLogContainer').addEventListener('scroll', () => this._updateRCButtons());
        document.getElementById('ptLogContainer').addEventListener('scroll', () => this._updatePTButtons());
    }

    _initTabs() {
        const tabs = document.querySelectorAll('.tab');
        const panels = document.querySelectorAll('.tab-panel');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.disabled) return;
                const target = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                panels.forEach(p => {
                    p.classList.add('hidden');
                    p.classList.remove('active');
                });
                const panel = document.getElementById('panel' + target.charAt(0).toUpperCase() + target.slice(1));
                if (panel) {
                    panel.classList.remove('hidden');
                    panel.classList.add('active');
                }
            });
        });
    }

    _initLogToggle() {
        const logHeader = document.getElementById('logHeader');
        const logContainer = document.getElementById('logContainer');
        const toggleIcon = document.getElementById('logToggleIcon');

        logHeader.style.cursor = 'pointer';
        logHeader.addEventListener('click', () => {
            if (logContainer.style.display === 'none') {
                logContainer.style.display = 'block';
                toggleIcon.textContent = ' ▼';
                logContainer.scrollTop = logContainer.scrollHeight;
            } else {
                logContainer.style.display = 'none';
                toggleIcon.textContent = ' ▶';
            }
        });
    }

    _initChannelSelects() {
        const addrSelects = ['ptLocalAddr', 'ptReqTargetAddr', 'ptPacketTargetAddr'];
        addrSelects.forEach(id => {
            const sel = document.getElementById(id);
            for (let i = 0; i < 256; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i;
                sel.appendChild(opt);
            }
        });
    }

    _fillChannelSelects(totalChannels) {
        const channelIds = ['devTxChID', 'devRxChID', 'rcTxChID', 'rcRxChID', 'aqpngRCTxID', 'aqpngRCRxID'];
        channelIds.forEach(id => {
            const sel = document.getElementById(id);
            sel.innerHTML = '';
            for (let i = 0; i < totalChannels; i++) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i;
                sel.appendChild(opt);
            }
        });
    }

    _setTabsEnabled(enabled) {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(t => t.disabled = !enabled);
        if (!enabled && this.isAutoMode) {
            tabs.forEach(t => {
                if (t.dataset.tab !== 'remoteRequests') t.disabled = true;
            });
        }
    }

    // ==================== Connect / Disconnect ====================
    async _connect() {
        const btn = document.getElementById('btnConnect');
        btn.disabled = true;
        btn.textContent = '...';
        this._addMainLog(I18n.translate('msg_connecting'), 'info');

        try {
            await this.modem.open();
            document.getElementById('btnDisconnect').disabled = false;
            btn.textContent = I18n.translate('connect');
        } catch (err) {
            this._addMainLog(I18n.translate('msg_connect_error') + err.message, 'error');
            btn.disabled = false;
            btn.textContent = I18n.translate('connect');
        }
    }

    async _disconnect() {
        await this.modem.close();
        document.getElementById('btnConnect').disabled = false;
        document.getElementById('btnConnect').textContent = I18n.translate('connect');
        document.getElementById('btnDisconnect').disabled = true;
        this._updateUIState(false);
        this._clearDeviceInfo();
    }

    _setConnectionBadge(status) {
        const badge = document.getElementById('connectionStatus');
        badge.className = 'status-badge ' + status;
        const texts = {
            connected: I18n.translate('status_connected'),
            disconnected: I18n.translate('status_disconnected'),
            busy: I18n.translate('status_busy')
        };
        badge.textContent = texts[status] || status;
    }

    _updateUIState(hasDevice) {
        const deviceBtns = document.querySelectorAll('[id^="btnApply"], [id^="btnQueryDeviceInfo"], [id^="btnRCSend"], [id^="btnPT"], [id^="btnLS"], [id^="btnAqpng"]');
        deviceBtns.forEach(b => {
            if (b.id === 'btnAqpngDefaults') return;
            if (b.id === 'btnDefaultSettings') return;
            b.disabled = !hasDevice;
        });
        document.getElementById('btnQueryDeviceInfo').disabled = !hasDevice;
        document.getElementById('btnRCSend').disabled = !hasDevice;
    }

    _clearDeviceInfo() {
        ['devSystem', 'devCore', 'devSerial', 'devBaudrate', 'devTotalCh', 'devPTS'].forEach(id => {
            document.getElementById(id).textContent = '-';
        });
    }

    // ==================== Device Info ====================
    _queryDeviceInfo() {
        this.modem.queryDINFO();
    }

    _onDeviceInfo() {
        if (!this.modem.isDeviceInfoValid) return;
        document.getElementById('devSystem').textContent = `${this.modem.systemMoniker} v${this.modem.systemVersion}`;
        document.getElementById('devCore').textContent = `${this.modem.coreMoniker} v${this.modem.coreVersion}`;
        document.getElementById('devSerial').textContent = this.modem.serialNumber;
        document.getElementById('devBaudrate').textContent = `${this.modem.acousticBaudrate.toFixed(2)} bps`;
        document.getElementById('devTotalCh').textContent = this.modem.totalCodeChannels;
        document.getElementById('devPTS').textContent = this.modem.isPTS ? 'yes' : 'no';

        this._fillChannelSelects(this.modem.totalCodeChannels);
        document.getElementById('devTxChID').value = this.modem.txChID;
        document.getElementById('devRxChID').value = this.modem.rxChID;
        document.getElementById('devSalinityPSU').value = this.modem.salinityPSU;
        document.getElementById('devCmdModeDefault').checked = this.modem.isCommandModeByDefault;

        this._updateUIState(true);
        this._addMainLog(I18n.translate('msg_device_info_ok'), 'success');
    }

    // ==================== Device Settings ====================
    _defaultSettings() {
        document.getElementById('devTxChID').value = '0';
        document.getElementById('devRxChID').value = '0';
        document.getElementById('devSalinityPSU').value = '0';
        document.getElementById('devGravityAcc').value = '9.8';
        document.getElementById('devCmdModeDefault').checked = true;
        document.getElementById('devACKOnTxFinished').checked = false;
    }

    _applySettings() {
        const txCh = parseInt(document.getElementById('devTxChID').value);
        const rxCh = parseInt(document.getElementById('devRxChID').value);
        const sal = parseFloat(document.getElementById('devSalinityPSU').value);
        const grav = parseFloat(document.getElementById('devGravityAcc').value);
        const cmdMode = document.getElementById('devCmdModeDefault').checked;
        const ackTx = document.getElementById('devACKOnTxFinished').checked;

        this.modem.querySettingsWrite(txCh, rxCh, sal, cmdMode, ackTx, grav);
        this._addMainLog(I18n.translate('msg_apply_settings', txCh, rxCh, sal, cmdMode, ackTx, grav), 'info');
    }

    // ==================== Remote Requests ====================
    _sendRC() {
        const txCh = parseInt(document.getElementById('rcTxChID').value);
        const rxCh = parseInt(document.getElementById('rcRxChID').value);
        const cmdID = parseInt(document.getElementById('rcCmdID').value);

        if (this.modem.queryRC(txCh, rxCh, cmdID)) {
            this._addRCLog(`(Tx=${txCh}:Rx=${rxCh}) << ${cmdID} ?...`);
        }
    }

    _toggleAuto(limit) {
        if (this.isAutoMode) {
            this.isAutoMode = false;
            this.autoRequestLimit = 0;
            this._updateAutoUI(false);
            this._addMainLog(I18n.translate('msg_auto_stop'), 'info');
            this._setTabsEnabled(true);
        } else {
            this.isAutoMode = true;
            this.autoRequestLimit = limit;
            this.autoRequestCount = 0;
            this.autoCodeIdx = 0;
            this._clearStats();
            this._updateAutoUI(true, limit);
            this._addMainLog(I18n.translate('msg_auto_start', limit === 0 ? 'FULL' : limit), 'info');
            this._setTabsEnabled(false);
            document.querySelector('.tab[data-tab="remoteRequests"]').disabled = false;
            this._sendRC();
        }
    }

    _updateAutoUI(isActive, limit = 0) {
        const statusDiv = document.getElementById('autoModeStatus');
        const buttons = [document.getElementById('btnAutoFull'), document.getElementById('btnAuto256'), document.getElementById('btnAuto128')];

        buttons.forEach(b => b.classList.remove('active'));

        if (isActive) {
            const label = limit === 0 ? 'FULL' : limit;
            statusDiv.innerHTML = `<span style="color:var(--accent);">${I18n.translate('auto_mode_on')} ${label}</span>`;
            if (limit === 0) document.getElementById('btnAutoFull').classList.add('active');
            else if (limit === 256) document.getElementById('btnAuto256').classList.add('active');
            else if (limit === 128) document.getElementById('btnAuto128').classList.add('active');
        } else {
            statusDiv.innerHTML = `<span>${I18n.translate('auto_mode_off')}</span>`;
        }
    }

    _continueAuto() {
        if (!this.isAutoMode) return;

        this.autoRequestCount++;
        if (this.autoRequestLimit > 0 && this.autoRequestCount >= this.autoRequestLimit) {
            const lim = this.autoRequestLimit;
            this._toggleAuto(0);
            this._addMainLog(I18n.translate('msg_auto_done', lim), 'info');
            this._setTabsEnabled(true);
            return;
        }

        const txCh = parseInt(document.getElementById('rcTxChID').value);
        const rxCh = parseInt(document.getElementById('rcRxChID').value);
        const cmdID = this.autoCodes[this.autoCodeIdx];
        this.autoCodeIdx = (this.autoCodeIdx + 1) % this.autoCodes.length;

        if (this.modem.queryRC(txCh, rxCh, cmdID)) {
            this._addRCLog(`(Tx=${txCh}:Rx=${rxCh}) << ${cmdID} ?...`);
        }
    }

    _onRCResponse(detail) {
        const { txChID, rxChID, rcCmdID, propTimeSec, msrDb, value, azimuth, isValuePresent, isAzimuthPresent } = detail;
        let msg = `(Tx=${txChID}:Rx=${rxChID}) >> ${rcCmdID} OK! \u2B21 Tp=${propTimeSec.toFixed(5)} s, MSR=${msrDb.toFixed(1)} dB`;

        if (isValuePresent) {
            if (rcCmdID === RC_CODES_Enum.RC_DPT_GET) {
                msg += `, Dpt=${value.toFixed(1)} m`;
                this._updateStat('DPT, m', value);
            } else if (rcCmdID === RC_CODES_Enum.RC_TMP_GET) {
                msg += `, T=${value.toFixed(1)}\u00B0C`;
                this._updateStat('TMP, \u00B0C', value);
            } else if (rcCmdID === RC_CODES_Enum.RC_BAT_V_GET) {
                msg += `, V=${value.toFixed(1)} V`;
                this._updateStat('BAT, V', value);
            }
        }

        if (isAzimuthPresent) {
            msg += `, \u03B1=${azimuth.toFixed(1)}\u00B0`;
            this._updateStat('AZM, \u00B0', azimuth);
        }

        this._updateStat('MSR, dB', msrDb);
        this.rcSuccessCount++;
        this._updateStatsDisplay();
        this._addRCLog(msg);

        if (this.isAutoMode) this._continueAuto();
    }

    _onRCTimeout(detail) {
        this._addRCLog(`(Tx=${detail.txChID}:Rx=${detail.rxChID}) >> ${detail.rcCmdID} Timeout...`);
        this.rcFailCount++;
        this._updateStatsDisplay();
        if (this.isAutoMode) this._continueAuto();
    }

    _onRCAsyncIn(detail) {
        let msg = `ASYNC IN >> ${detail.rcCmdID} \u2B21 MSR=${detail.msrDb.toFixed(1)} dB`;
        if (detail.isAzimuthPresent) msg += `, \u03B1=${detail.azimuthDeg.toFixed(1)}\u00B0`;
        this._addRCLog(msg);
    }

    // ==================== Statistics ====================
    _updateStat(key, value) {
        if (!this.rcStats[key]) this.rcStats[key] = [];
        this.rcStats[key].push(value);
        if (this.rcStats[key].length > 1000) this.rcStats[key].shift();
    }

    _updateStatsDisplay() {
        const lines = [];
        for (const [key, values] of Object.entries(this.rcStats)) {
            if (values.length === 0) continue;
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            lines.push(`${key}: avg=${avg.toFixed(2)}, min=${min.toFixed(2)}, max=${max.toFixed(2)}, n=${values.length}`);
        }
        const lang = I18n._lang;
        if (lang === 'ru') {
            lines.push(`Успешно: ${this.rcSuccessCount}, Ошибок: ${this.rcFailCount}`);
        } else {
            lines.push(`Success: ${this.rcSuccessCount}, Fail: ${this.rcFailCount}`);
        }
        document.getElementById('rcStatsText').textContent = lines.join('\n') || I18n.translate('no_data');
    }

    _clearStats() {
        this.rcStats = {};
        this.rcSuccessCount = 0;
        this.rcFailCount = 0;
        document.getElementById('rcStatsText').textContent = I18n.translate('no_data');
    }

    // ==================== Packet Mode ====================
    _ptQuerySettings() { this.modem.queryPTSettings(); }
    _ptApplySettings() {
        const addr = parseInt(document.getElementById('ptLocalAddr').value);
        const saveFlash = document.getElementById('ptSaveToFlash').checked;
        this.modem.queryPTSettingsWrite(saveFlash, true, addr);
        this._addPTLog(I18n.translate('msg_pt_apply', addr, saveFlash));
    }
    _ptReqSend() {
        const target = parseInt(document.getElementById('ptReqTargetAddr').value);
        const dataID = parseInt(document.getElementById('ptReqDataID').value);
        this.modem.queryPTITG(target, dataID);
        this._addPTLog(`#${target} << ${dataID} ?...`);
    }
    _ptPacketSend() {
        const target = parseInt(document.getElementById('ptPacketTargetAddr').value);
        const tries = parseInt(document.getElementById('ptPacketTries').value);
        const data = document.getElementById('ptPacketData').value;
        if (data.length > 64) {
            this._addPTLog(I18n.translate('msg_packet_too_large'));
            return;
        }
        const bytes = new TextEncoder().encode(data);
        this.modem.queryPTSend(target, bytes, tries);
        this._addPTLog(I18n.translate('msg_pt_packet', target, data, tries));
    }
    _ptPacketAbort() {
        this.modem.queryPTAbortSend();
        this._addPTLog(I18n.translate('msg_pt_abort'));
    }

    _onPTResponse(detail) {
        let msg = `#${detail.targetPtAddress} >> ${detail.dataId} OK! (${detail.dataValue}`;
        if (detail.dataId === 0) msg += ' m';
        else if (detail.dataId === 1) msg += ' \u00B0C';
        else if (detail.dataId === 2) msg += ' V';
        msg += `)\n\u2B21 Tp=${detail.propagationTimeS.toFixed(5)} s`;
        if (!isNaN(detail.azimuth)) msg += `, \u03B1=${detail.azimuth.toFixed(1)}\u00B0`;
        this._addPTLog(msg);
    }

    // ==================== Local Sensors ====================
    _onSensorData(data) {
        if (data.pressureMbar != null) document.getElementById('sensorPressure').textContent = `${data.pressureMbar.toFixed(1)} mBar`;
        if (data.temperatureC != null) document.getElementById('sensorTemperature').textContent = `${data.temperatureC.toFixed(1)}\u00B0C`;
        if (data.depthM != null) document.getElementById('sensorDepth').textContent = `${data.depthM.toFixed(1)} m`;
        if (data.voltageV != null) document.getElementById('sensorVoltage').textContent = `${data.voltageV.toFixed(1)} V`;
    }

    _onPTCROLData(data) {
        if (data.pitchDeg != null) document.getElementById('sensorPitch').textContent = `${data.pitchDeg.toFixed(1)}\u00B0`;
        if (data.rollDeg != null) document.getElementById('sensorRoll').textContent = `${data.rollDeg.toFixed(1)}\u00B0`;
    }

    _ls1Apply() {
        const saveFlash = document.getElementById('ls1SaveToFlash').checked;
        const periodRaw = document.getElementById('ls1Period').value;
        const periodMs = periodRaw === 'NEVER' ? 0 : (periodRaw === 'TANDEM' ? 1 : parseInt(periodRaw));
        const isPrs = document.getElementById('lsIsPressure').checked;
        const isTemp = document.getElementById('lsIsTemperature').checked;
        const isDpt = document.getElementById('lsIsDepth').checked;
        const isVcc = document.getElementById('lsIsVoltage').checked;

        this.modem.queryAmbCfgWrite(saveFlash, periodMs, isPrs, isTemp, isDpt, isVcc);
        this._addMainLog(I18n.translate('msg_ls1_applied', periodRaw, isPrs, isTemp, isDpt, isVcc), 'info');
    }

    _ls2Apply() {
        const saveFlash = document.getElementById('ls2SaveToFlash').checked;
        const periodRaw = document.getElementById('ls2Period').value;
        const periodMs = periodRaw === 'NEVER' ? 0 : (periodRaw === 'TANDEM' ? 1 : parseInt(periodRaw));

        this.modem.queryPTCROLCfgWrite(saveFlash, periodMs);
        this._addMainLog(I18n.translate('msg_ls2_applied', periodRaw), 'info');
    }

    // ==================== AQPNG ====================
    _aqpngDefaults() {
        document.getElementById('aqpngMode').value = '0';
        document.getElementById('aqpngPeriodMs').value = '2000';
        document.getElementById('aqpngDataID').value = '3';
        document.getElementById('aqpngRCTxID').value = '0';
        document.getElementById('aqpngRCRxID').value = '0';
        document.getElementById('aqpngIsPTMode').checked = false;
        document.getElementById('aqpngPTTargetAddr').value = '0';
        document.getElementById('aqpngSaveToFlash').checked = false;
        this._aqpngModeChanged();
    }

    _aqpngApply() {
        const saveFlash = document.getElementById('aqpngSaveToFlash').checked;
        const mode = parseInt(document.getElementById('aqpngMode').value);
        const period = parseInt(document.getElementById('aqpngPeriodMs').value);
        const dataID = parseInt(document.getElementById('aqpngDataID').value);
        const rcTx = parseInt(document.getElementById('aqpngRCTxID').value);
        const rcRx = parseInt(document.getElementById('aqpngRCRxID').value);
        const isPT = document.getElementById('aqpngIsPTMode').checked;
        const ptAddr = parseInt(document.getElementById('aqpngPTTargetAddr').value);

        this.modem.queryAQPNGSettingsWrite(saveFlash, mode, period, dataID, rcTx, rcRx, isPT, ptAddr);
        this._addMainLog(I18n.translate('msg_aqpng_applied', mode, period, dataID, rcTx, rcRx, isPT), 'info');
    }

    _aqpngModeChanged() {
        const mode = parseInt(document.getElementById('aqpngMode').value);
        const isPT = document.getElementById('aqpngIsPTMode').checked;
        const showPTAddr = mode === AQPNGModeIDs.AQPNG_MASTER && isPT;
        document.getElementById('aqpngPTAddrGroup').style.display = showPTAddr ? 'block' : 'none';
        document.getElementById('aqpngRCTxID').disabled = isPT;
        document.getElementById('aqpngRCRxID').disabled = isPT;
    }

    _onAQPNGSettings(data) {
        document.getElementById('aqpngMode').value = data.mode;
        document.getElementById('aqpngPeriodMs').value = data.periodMs;
        document.getElementById('aqpngDataID').value = data.dataId;
        document.getElementById('aqpngRCTxID').value = data.txID;
        document.getElementById('aqpngRCRxID').value = data.rxID;
        document.getElementById('aqpngIsPTMode').checked = data.isPT;
        document.getElementById('aqpngPTTargetAddr').value = data.ptTargetAddr;
        this._aqpngModeChanged();
        this._addMainLog(I18n.translate('msg_aqpng_settings_ok'), 'success');
    }

    // ==================== Logging ====================
    _addMainLog(msg, type = 'info') {
        this._addLogEntry('logContainer', msg, type);
    }

    _addRCLog(msg) {
        this._addLogEntry('rcLogContainer', msg, 'info');
        if (document.getElementById('rcAutoscroll').checked) {
            const c = document.getElementById('rcLogContainer');
            c.scrollTop = c.scrollHeight;
        }
        this._updateRCButtons();
    }

    _addPTLog(msg) {
        this._addLogEntry('ptLogContainer', msg, 'info');
        const c = document.getElementById('ptLogContainer');
        c.scrollTop = c.scrollHeight;
        this._updatePTButtons();
    }

    _addLogEntry(containerId, msg, type) {
        const container = document.getElementById(containerId);
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + type;
        const timestamp = new Date().toLocaleTimeString();
        entry.textContent = `[${timestamp}] ${msg}`;
        container.appendChild(entry);
        if (container.children.length > this.maxLogEntries) {
            container.removeChild(container.firstChild);
        }
    }

    _updateRCButtons() {
        const container = document.getElementById('rcLogContainer');
        document.getElementById('btnRCCopy').disabled = container.children.length === 0;
        document.getElementById('btnRCClear').disabled = container.children.length === 0;
    }

    _updatePTButtons() {
        const container = document.getElementById('ptLogContainer');
        document.getElementById('btnPTCopy').disabled = container.children.length === 0;
        document.getElementById('btnPTClear').disabled = container.children.length === 0;
    }

    _copyLog(containerId) {
        const container = document.getElementById(containerId);
        const text = Array.from(container.children).map(e => e.textContent).join('\n');
        navigator.clipboard.writeText(text).then(() => {
            this._addMainLog(I18n.translate('msg_copied'), 'info');
        }).catch(() => {
            this._addMainLog(I18n.translate('msg_copy_failed'), 'error');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        window.uWaveApp = new UWaveApp();
    } catch (err) {
        console.error('uWaver init failed:', err.message);
        console.error(err.stack);
    }
});