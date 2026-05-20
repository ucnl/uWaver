// uWavePort.js — uWave modem driver (based on working SerialBridge + RPHPort)

// ======================== КОНСТАНТЫ И ЕНУМЫ ========================
const ICs = Object.freeze({
    IC_D2H_ACK: 'IC_D2H_ACK',
    IC_H2D_SETTINGS_WRITE: 'IC_H2D_SETTINGS_WRITE',
    IC_H2D_RC_REQUEST: 'IC_H2D_RC_REQUEST',
    IC_D2H_RC_RESPONSE: 'IC_D2H_RC_RESPONSE',
    IC_D2H_RC_TIMEOUT: 'IC_D2H_RC_TIMEOUT',
    IC_D2H_RC_ASYNC_IN: 'IC_D2H_RC_ASYNC_IN',
    IC_H2D_AMB_DTA_CFG: 'IC_H2D_AMB_DTA_CFG',
    IC_D2H_AMB_DTA: 'IC_D2H_AMB_DTA',
    IC_H2D_INC_DTA_CFG: 'IC_H2D_INC_DTA_CFG',
    IC_D2H_INC_DTA: 'IC_D2H_INC_DTA',
    IC_H2D_DINFO_GET: 'IC_H2D_DINFO_GET',
    IC_D2H_DINFO: 'IC_D2H_DINFO',
    IC_H2D_PT_SETTINGS_READ: 'IC_H2D_PT_SETTINGS_READ',
    IC_D2H_PT_SETTINGS: 'IC_D2H_PT_SETTINGS',
    IC_H2H_PT_SETTINGS_WRITE: 'IC_H2H_PT_SETTINGS_WRITE',
    IC_H2D_PT_SEND: 'IC_H2D_PT_SEND',
    IC_D2H_PT_FAILED: 'IC_D2H_PT_FAILED',
    IC_D2H_PT_DLVRD: 'IC_D2H_PT_DLVRD',
    IC_D2H_PT_RCVD: 'IC_D2H_PT_RCVD',
    IC_H2D_PT_ITG: 'IC_H2D_PT_ITG',
    IC_D2H_PT_ITG_TMO: 'IC_D2H_PT_ITG_TMO',
    IC_D2H_PT_ITG_RESP: 'IC_D2H_PT_ITG_RESP',
    IC_H2D_AQPNG_SETTINGS_READ: 'IC_H2D_AQPNG_SETTINGS_READ',
    IC_HDH_AQPNG_SETTINGS: 'IC_HDH_AQPNG_SETTINGS',
    IC_D2H_ANY: 'IC_D2H_ANY',
    IC_INVALID: 'IC_INVALID'
});

const RC_CODES_Enum = Object.freeze({
    RC_PING: 0, RC_PONG: 1, RC_DPT_GET: 2, RC_TMP_GET: 3, RC_BAT_V_GET: 4,
    RC_ERR_NSUP: 5, RC_ACK: 6, RC_USR_CMD_000: 7, RC_USR_CMD_001: 8,
    RC_USR_CMD_002: 9, RC_USR_CMD_003: 10, RC_USR_CMD_004: 11,
    RC_USR_CMD_005: 12, RC_USR_CMD_006: 13, RC_USR_CMD_007: 14,
    RC_USR_CMD_008: 15, RC_MSG_ASYNC_IN: 16, RC_INVALID: -1
});

const LOC_ERR_Enum = Object.freeze({
    LOC_ERR_NO_ERROR: 0, LOC_ERR_INVALID_SYNTAX: 1, LOC_ERR_UNSUPPORTED: 2,
    LOC_ERR_TRANSMITTER_BUSY: 3, LOC_ERR_ARGUMENT_OUT_OF_RANGE: 4,
    LOC_ERR_INVALID_OPERATION: 5, LOC_ERR_UNKNOWN_FIELD_ID: 6,
    LOC_ERR_VALUE_UNAVAILABLE: 7, LOC_ERR_RECEIVER_BUSY: 8,
    LOC_ERR_TX_BUFFER_OVERRUN: 9, LOC_ERR_CHKSUM_ERROR: 10,
    LOC_ERR_TX_FINISHED: 11, LOC_ACK_BEFORE_STANDBY: 12,
    LOC_ACK_AFTER_WAKEUP: 13, LOC_ERR_SVOLTAGE_TOO_HIGH: 14,
    LOC_ERR_UNKNOWN: -1
});

const DataID_Enum = Object.freeze({ DID_DPT: 0, DID_TMP: 1, DID_BAT: 2, DID_INVALID: -1 });
const AQPNGModeIDs = Object.freeze({ AQPNG_DISABLED: 0, AQPNG_PINGER: 1, AQPNG_MASTER: 2, AQPNG_INVALID: -1 });

// ======================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========================
function o2i(val) { if (val === null || val === undefined || val === '') return -1; const i = parseInt(val); return isNaN(i) ? -1 : i; }
function o2d(val) { if (val === null || val === undefined || val === '') return NaN; const d = parseFloat(val); return isNaN(d) ? NaN : d; }
function o2s(val) { return val === null || val === undefined ? '' : String(val); }
function o2rc(val) { const i = o2i(val); return (i >= 0 && i <= 16) ? i : RC_CODES_Enum.RC_INVALID; }
function o2le(val) { const i = o2i(val); return (i >= 0 && i <= 14) ? i : LOC_ERR_Enum.LOC_ERR_UNKNOWN; }
function o2did(val) { const i = o2i(val); return (i >= 0 && i <= 2) ? i : DataID_Enum.DID_INVALID; }
function o2am(val) { const i = o2i(val); return (i >= 0 && i <= 2) ? i : AQPNGModeIDs.AQPNG_INVALID; }
function bcdToStr(v) { if (v < 0) return ''; return `${v >> 8}.${(v & 0xFF).toString(16).padStart(2, '0').toUpperCase()}`; }
function hexToBytes(hex) { if (hex.startsWith('0x')) hex = hex.substring(2); const bytes = new Uint8Array(hex.length / 2); for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16); return bytes; }
function bytesToHex(bytes) { return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }

// ======================== SerialBridge (из рабочего кода RedPhone) ========================
class SerialBridge {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isOpen = false;
        this.lineBuffer = '';
        this.onMessage = null;
        this.onError = null;
        this.onClose = null;
        this.onRawData = null;
    }

    async open(baudRate = 9600) {
        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({
                baudRate: baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            });
            this.isOpen = true;
            this.writer = this.port.writable.getWriter();
            this.reader = this.port.readable.getReader();
            this.lineBuffer = '';
            this._readLoop();
            return true;
        } catch (err) {
            this.isOpen = false;
            if (this.onError) this.onError(err);
            throw err;
        }
    }

    async send(message) {
        if (!this.writer) throw new Error('Port not open');
        const encoder = new TextEncoder();
        await this.writer.write(encoder.encode(message));
    }

    async sendRaw(data) {
        if (!this.writer) throw new Error('Port not open');
        await this.writer.write(data);
    }

    async _readLoop() {
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                console.log('!!! DATA RECEIVED, length:', value ? value.length : 0, 'done:', done);
                if (done) break;
                if (this.onRawData) this.onRawData(value);
                buffer += decoder.decode(value, { stream: true });
                let newlineIdx;
                while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.substring(0, newlineIdx + 1);
                    buffer = buffer.substring(newlineIdx + 1);
                    if (this.onMessage) this.onMessage(line);
                }
                if (buffer.length > 65535) { console.warn('SerialBridge: buffer overflow, resetting'); buffer = ''; }
            }
        } catch (err) {
            if (err.name !== 'NetworkError' && err.name !== 'AbortError' && this.onError) this.onError(err);
        }
        this.isOpen = false;
        if (this.onClose) this.onClose();
    }

    async close() {
        if (this.reader) { try { this.reader.cancel(); } catch (e) {} try { this.reader.releaseLock(); } catch (e) {} this.reader = null; }
        if (this.writer) { try { this.writer.releaseLock(); } catch (e) {} this.writer = null; }
        if (this.port) { try { await this.port.close(); } catch (e) {} this.port = null; }
        this.isOpen = false;
    }
}

// ======================== uWave NMEA (минимальный, как в RedPhone) ========================
const UWAVE_NMEA = {
    MC: 'UWV',
    START: '$',
    END: '\r\n',
    SEP: ',',
    CHK: '*',

    checksum(str) {
        let cs = 0;
        for (let i = 0; i < str.length; i++) cs ^= str.charCodeAt(i);
        return cs & 0xFF;
    },

    build(sentenceId, params) {
        const fields = params.map(p => {
            if (p === null || p === undefined) return '';
            if (p instanceof Uint8Array || Array.isArray(p)) return bytesToHex(new Uint8Array(p));
            if (typeof p === 'number') return Number.isInteger(p) ? p.toString() : p.toFixed(6).replace(/\.?0+$/, '');
            return String(p);
        });
        let core = 'P' + this.MC + sentenceId;
        if (fields.length > 0) core += this.SEP + fields.join(this.SEP);
        const cs = this.checksum(core);
        return this.START + core + this.CHK + cs.toString(16).toUpperCase().padStart(2, '0') + this.END;
    },

    parse(raw) {
        if (!raw || raw.length === 0) return null;
        const line = raw.replace(/[\r\n]+$/, '');
        if (!line.startsWith(this.START)) return null;
        const chkIdx = line.indexOf(this.CHK);
        let core, declaredCs;
        if (chkIdx >= 0) { core = line.substring(1, chkIdx); declaredCs = line.substring(chkIdx + 1); }
        else { core = line.substring(1); declaredCs = null; }
        if (declaredCs) { const realCs = this.checksum(core); if (realCs !== parseInt(declaredCs, 16)) return { valid: false, error: 'checksum' }; }
        const fields = core.split(this.SEP);
        if (fields.length === 0) return null;
        const header = fields[0];
        if (!header.startsWith('P') || header.length < 5) return null;
        const manufacturer = header.substring(1, 4);
        if (manufacturer !== this.MC) return null;
        const sentenceId = header.substring(4);
        const params = fields.slice(1).map(f => {
            if (f === '') return null;
            if (f.startsWith('0x') || f.startsWith('0X')) return hexToBytes(f);
            if (/^-?\d+$/.test(f)) return parseInt(f, 10);
            if (/^-?\d+\.\d+$/.test(f)) return parseFloat(f);
            return f;
        });
        return { manufacturer, sentenceId, params, valid: true };
    }
};

// ======================== uWavePort (на базе RPHPort) ========================
class uWavePort extends EventTarget {
    constructor(baudRate = 9600) {
        super();
        this.serial = new SerialBridge();
        this.baudRate = baudRate;
        this.detected = false;
        this.connecting = false;
        this.isWaitingLocal = false;
        this.isWaitingRemote = false;
        this.lastQueryID = ICs.IC_INVALID;
        this.rcQueryRxChID = -1;
        this.defaultTimeoutMs = 1000;
        this.longTimeoutMs = 3000;
        this.remoteTimeoutMs = 6000;
        this.timerPeriodMs = 200;
        this.timeoutTimer = null;
        this.timerCnt = 0;
        this.timerCntMax = 5;

        // Device info
        this.serialNumber = '';
        this.systemMoniker = '';
        this.systemVersion = '';
        this.coreMoniker = '';
        this.coreVersion = '';
        this.acousticBaudrate = 0;
        this.rxChID = 0;
        this.txChID = 0;
        this.totalCodeChannels = 0;
        this.salinityPSU = 0;
        this.isPTS = false;
        this.isCommandModeByDefault = false;
        this.isACKOnTxFinished = false;
        this.ptAddress = 0;
        this.isDeviceInfoValid = false;

        // Sensors
        this.pitchDeg = null;
        this.rollDeg = null;
        this.pressureMbar = null;
        this.temperatureC = null;
        this.depthM = null;
        this.voltageV = null;

        this.serial.onMessage = (line) => this._onNMEAMessage(line);
        this.serial.onError = (err) => this._emit('error', { message: err.message });
        this.serial.onClose = () => this._onClose();
    }

    get isOpen() { return this.serial.isOpen; }

    async open() {
       if (this.connecting || this.serial.isOpen) {
           throw new Error('Already connecting or connected');
       }
       this.connecting = true;
       try {
           await this.serial.open(this.baudRate);
                   
           // Отправляем DINFO напрямую, без проверки detected
           const msg = UWAVE_NMEA.build('?', [0]);
           await this.serial.send(msg);
           this._emit('log', { message: `SND << ${msg.trim()}` });
        
           this._startTimer(this.defaultTimeoutMs);
       } catch (err) {
           this.connecting = false;
           this._emit('error', { message: err.message });
           throw err;
       }
    }

    async close() {
        this._stopTimer();
        await this.serial.close();
        this.detected = false;
        this.isDeviceInfoValid = false;
        this.connecting = false;
        this.isWaitingLocal = false;
        this.isWaitingRemote = false;
        this._emit('stateChanged');
    }

    _onClose() {
        this._emit('log', { message: 'Port closed' });
        this.detected = false;
        this.isDeviceInfoValid = false;
        this.connecting = false;
        this._emit('stateChanged');
    }

    // ======================== NMEA Message Handler ========================
    _onNMEAMessage(rawLine) {
        this._resetTimer();
        this._emit('log', { message: `RCV >> ${rawLine.trim()}` });

        const parsed = UWAVE_NMEA.parse(rawLine);
        if (!parsed || !parsed.valid) {
            if (parsed && parsed.error === 'checksum') {
                this._emit('log', { message: `Checksum error: ${rawLine.trim()}` });
            }
            return;
        }

        if (!this.detected) {
            this.detected = true;
            this._stopTimer();
            this._emit('stateChanged');
        }

        this._processIncoming(parsed);
    }

    _processIncoming(parsed) {
        const { sentenceId, params } = parsed;
        switch (sentenceId) {
            case '0': this._parseACK(params); break;
            case '3': this._parseRC_RESPONSE(params); break;
            case '4': this._parseRC_TIMEOUT(params); break;
            case '5': this._parseRC_ASYNC(params); break;
            case '7': this._parseAMB_DTA(params); break;
            case '9': this._parseINC_DTA(params); break;
            case '!': this._parseDINFO(params); break;
            case 'E': this._parsePT_SETTINGS(params); break;
            case 'H': this._parsePT_FAILED(params); break;
            case 'I': this._parsePT_DLVRD(params); break;
            case 'J': this._parsePT_RCVD(params); break;
            case 'L': this._parsePT_ITG_TMO(params); break;
            case 'M': this._parsePT_ITG_RESP(params); break;
            case 'O': this._parseAQPNG(params); break;
        }
    }

    // ======================== Command Sending ========================
    _trySend(message, queryID) {
        if (!this.detected || this.isWaitingLocal || this.isWaitingRemote) return false;
        try {
            this.serial.send(message);
            this._emit('log', { message: `SND << ${message.trim()}` });
            const timeout = [ICs.IC_H2D_SETTINGS_WRITE, ICs.IC_H2H_PT_SETTINGS_WRITE, ICs.IC_H2D_AMB_DTA_CFG, ICs.IC_H2D_INC_DTA_CFG].includes(queryID) ? this.longTimeoutMs : this.defaultTimeoutMs;
            this._startTimer(timeout);
            this.isWaitingLocal = true;
            this.lastQueryID = queryID;
            this._emit('stateChanged');
            return true;
        } catch (err) {
            this._emit('error', { message: `Send error: ${err.message}` });
            return false;
        }
    }

    queryDINFO() { return this._trySend(UWAVE_NMEA.build('?', [0]), ICs.IC_H2D_DINFO_GET); }
    querySettingsWrite(txChID, rxChID, salinityPSU, isCmdMode, isACKOnTXFinished, gravityAcc) {
        this.isACKOnTxFinished = isACKOnTXFinished;
        return this._trySend(UWAVE_NMEA.build('1', [txChID, rxChID, salinityPSU, isCmdMode ? 1 : 0, isACKOnTXFinished ? 1 : 0, gravityAcc]), ICs.IC_H2D_SETTINGS_WRITE);
    }
    queryAmbCfgWrite(isSaveToFlash, periodMs, isPressure, isTemperature, isDepth, isVCC) {
        return this._trySend(UWAVE_NMEA.build('6', [isSaveToFlash ? 1 : 0, periodMs, isPressure ? 1 : 0, isTemperature ? 1 : 0, isDepth ? 1 : 0, isVCC ? 1 : 0]), ICs.IC_H2D_AMB_DTA_CFG);
    }
    queryPTCROLCfgWrite(isSaveToFlash, periodMs) {
        return this._trySend(UWAVE_NMEA.build('8', [isSaveToFlash ? 1 : 0, periodMs]), ICs.IC_H2D_INC_DTA_CFG);
    }
    queryRC(txChID, rxChID, cmdID) {
        if (this.isWaitingRemote) { this._emit('log', { message: 'ERROR: Unable to perform remote request — waiting for previous' }); return false; }
        this.rcQueryRxChID = rxChID;
        return this._trySend(UWAVE_NMEA.build('2', [txChID, rxChID, cmdID]), ICs.IC_H2D_RC_REQUEST);
    }
    queryPTSettings() { return this._trySend(UWAVE_NMEA.build('D', [0]), ICs.IC_H2D_PT_SETTINGS_READ); }
    queryPTSettingsWrite(isSaveInFlash, isPTMode, ptAddress) {
        return this._trySend(UWAVE_NMEA.build('F', [isSaveInFlash ? 1 : 0, isPTMode ? 1 : 0, ptAddress]), ICs.IC_H2H_PT_SETTINGS_WRITE);
    }
    queryPTAbortSend() { return this._trySend(UWAVE_NMEA.build('G', [null, null, null]), ICs.IC_H2D_PT_SEND); }
    queryPTSend(targetPtAddress, data, maxTries = null) {
        if (data.length > 64) { this._emit('log', { message: 'ERROR: Packet size exceeds 64 bytes' }); return false; }
        return this._trySend(UWAVE_NMEA.build('G', [targetPtAddress, maxTries, data]), ICs.IC_H2D_PT_SEND);
    }
    queryPTITG(targetPtAddress, dataID) { return this._trySend(UWAVE_NMEA.build('K', [targetPtAddress, dataID]), ICs.IC_H2D_PT_ITG); }
    queryAQPNGSettings() { return this._trySend(UWAVE_NMEA.build('N', [0]), ICs.IC_H2D_AQPNG_SETTINGS_READ); }
    queryAQPNGSettingsWrite(isSaveToFlash, modeID, periodMs, dataID, rcTxChID, rcRxChID, isPT, ptTargetAddr) {
        return this._trySend(UWAVE_NMEA.build('O', [isSaveToFlash ? 1 : 0, modeID, periodMs, dataID, rcTxChID, rcRxChID, isPT ? 1 : 0, ptTargetAddr]), ICs.IC_HDH_AQPNG_SETTINGS);
    }

    // ======================== Parsers ========================
    _parseACK(params) {
        const sntID = this._icsByMsgID(o2s(params[0]));
        const errID = o2le(params[1]);
        this._stopTimer();
        this.isWaitingLocal = false;
        if (sntID === ICs.IC_H2D_RC_REQUEST || sntID === ICs.IC_H2D_PT_ITG) {
            this.isWaitingRemote = true;
            this._startTimer(this.remoteTimeoutMs);
        }
        this._emit('ackReceived', { sentenceID: sntID, errorID: errID });
        this._emit('stateChanged');
    }

    _parseRC_RESPONSE(params) {
        const txChID = o2i(params[0]); const rcCmdID = o2rc(params[1]);
        const pTime = o2d(params[2]); const msr = o2d(params[3]);
        const value = o2d(params[4]); const azimuth = o2d(params[5]);
        this._stopTimer(); this.isWaitingRemote = false;
        this._emit('rcResponseReceived', { txChID, rxChID: this.rcQueryRxChID, rcCmdID, propTimeSec: pTime, msrDb: msr, value, azimuth, isValuePresent: !isNaN(value), isAzimuthPresent: !isNaN(azimuth) });
        this._emit('stateChanged');
    }

    _parseRC_TIMEOUT(params) {
        const txChID = o2i(params[0]); const rcCmdID = o2rc(params[1]);
        this._stopTimer(); this.isWaitingRemote = false;
        this._emit('rcTimeoutReceived', { txChID, rxChID: this.rcQueryRxChID, rcCmdID });
        this._emit('stateChanged');
    }

    _parseRC_ASYNC(params) {
        const rcCmdID = o2rc(params[0]); const msrDb = o2d(params[1]); const azimuthDeg = o2d(params[2]);
        this._stopTimer(); this.isWaitingRemote = false;
        this._emit('rcAsyncInReceived', { rcCmdID, msrDb, azimuthDeg, isAzimuthPresent: !isNaN(azimuthDeg) });
        this._emit('stateChanged');
    }

    _parseAMB_DTA(params) {
        const prs = o2d(params[0]); const temp = o2d(params[1]); const dpt = o2d(params[2]); const vcc = o2d(params[3]);
        if (!isNaN(prs)) this.pressureMbar = prs; if (!isNaN(temp)) this.temperatureC = temp;
        if (!isNaN(dpt)) this.depthM = dpt; if (!isNaN(vcc)) this.voltageV = vcc;
        this._emit('ambDataUpdated', { pressureMbar: this.pressureMbar, temperatureC: this.temperatureC, depthM: this.depthM, voltageV: this.voltageV });
    }

    _parseINC_DTA(params) {
        const pitch = o2d(params[1]); const roll = o2d(params[2]);
        if (!isNaN(pitch)) this.pitchDeg = pitch; if (!isNaN(roll)) this.rollDeg = roll;
        this._emit('ptcrolDataUpdated', { pitchDeg: this.pitchDeg, rollDeg: this.rollDeg });
    }

    _parseDINFO(params) {
        this.serialNumber = o2s(params[0]); this.systemMoniker = o2s(params[1]); this.systemVersion = bcdToStr(o2i(params[2]));
        this.coreMoniker = o2s(params[3]); this.coreVersion = bcdToStr(o2i(params[4])); this.acousticBaudrate = o2d(params[5]);
        this.rxChID = o2i(params[6]); this.txChID = o2i(params[7]); this.totalCodeChannels = o2i(params[8]);
        this.salinityPSU = o2d(params[9]); this.isPTS = o2i(params[10]) !== 0; this.isCommandModeByDefault = o2i(params[11]) !== 0;
        this._stopTimer(); this.isWaitingLocal = false; this.isDeviceInfoValid = true;
        this._emit('deviceInfoValidChanged'); this._emit('stateChanged');
    }

    _parsePT_SETTINGS(params) { this.ptAddress = o2i(params[1]); this._stopTimer(); this.isWaitingLocal = false; this._emit('packetModeSettingsReceived', { isPTMode: o2i(params[0]) !== 0, ptAddress: this.ptAddress }); }
    _parsePT_FAILED(params) { this._emit('packetTransferFailed', { targetPtAddress: o2i(params[0]), triesTaken: o2i(params[1]), azimuth: NaN, dataPacket: Array.isArray(params[2]) ? new Uint8Array(params[2]) : params[2] }); }
    _parsePT_DLVRD(params) { this._emit('packetTransferred', { targetPtAddress: o2i(params[0]), triesTaken: o2i(params[1]), azimuth: o2d(params[2]), dataPacket: Array.isArray(params[3]) ? new Uint8Array(params[3]) : params[3] }); }
    _parsePT_RCVD(params) { this._emit('packetReceived', { targetPtAddress: o2i(params[0]), azimuth: o2d(params[1]), dataPacket: Array.isArray(params[2]) ? new Uint8Array(params[2]) : params[2] }); }
    _parsePT_ITG_TMO(params) { this._stopTimer(); this.isWaitingRemote = false; this._emit('packetRequestTimeout', { targetPtAddress: o2i(params[0]), dataId: o2did(params[1]) }); this._emit('stateChanged'); }
    _parsePT_ITG_RESP(params) { this._stopTimer(); this.isWaitingRemote = false; this._emit('packetResponse', { targetPtAddress: o2i(params[0]), dataId: o2did(params[1]), dataValue: o2d(params[2]), propagationTimeS: o2d(params[3]), azimuth: o2d(params[4]) }); this._emit('stateChanged'); }
    _parseAQPNG(params) { this._stopTimer(); this.isWaitingLocal = false; this._emit('aqpngSettingsReceived', { mode: o2am(params[1]), periodMs: o2i(params[2]), dataId: o2i(params[3]), txID: o2i(params[4]), rxID: o2i(params[5]), isPT: o2i(params[6]) !== 0, ptTargetAddr: o2i(params[7]) }); }

    // ======================== Timer ========================
    _startTimer(timeoutMs) { this._stopTimer(); this.timerCnt = 0; this.timerCntMax = Math.max(1, Math.ceil(timeoutMs / this.timerPeriodMs)); this.timeoutTimer = setInterval(() => this._timerTick(), this.timerPeriodMs); }
    _stopTimer() { if (this.timeoutTimer) { clearInterval(this.timeoutTimer); this.timeoutTimer = null; } this.timerCnt = 0; }
    _resetTimer() { this.timerCnt = 0; }
    _timerTick() { this.timerCnt++; if (this.timerCnt >= this.timerCntMax) { this._stopTimer(); if (this.detected) { this._emit('portTimeout'); this.detected = false; this.isWaitingLocal = false; this.isWaitingRemote = false; this._emit('stateChanged'); } } }

    _icsByMsgID(msgID) {
        const map = { '0': ICs.IC_D2H_ACK, '1': ICs.IC_H2D_SETTINGS_WRITE, '2': ICs.IC_H2D_RC_REQUEST, '3': ICs.IC_D2H_RC_RESPONSE, '4': ICs.IC_D2H_RC_TIMEOUT, '5': ICs.IC_D2H_RC_ASYNC_IN, '6': ICs.IC_H2D_AMB_DTA_CFG, '7': ICs.IC_D2H_AMB_DTA, '8': ICs.IC_H2D_INC_DTA_CFG, '9': ICs.IC_D2H_INC_DTA, '?': ICs.IC_H2D_DINFO_GET, '!': ICs.IC_D2H_DINFO, 'D': ICs.IC_H2D_PT_SETTINGS_READ, 'E': ICs.IC_D2H_PT_SETTINGS, 'F': ICs.IC_H2H_PT_SETTINGS_WRITE, 'G': ICs.IC_H2D_PT_SEND, 'H': ICs.IC_D2H_PT_FAILED, 'I': ICs.IC_D2H_PT_DLVRD, 'J': ICs.IC_D2H_PT_RCVD, 'K': ICs.IC_H2D_PT_ITG, 'L': ICs.IC_D2H_PT_ITG_TMO, 'M': ICs.IC_D2H_PT_ITG_RESP, 'N': ICs.IC_H2D_AQPNG_SETTINGS_READ, 'O': ICs.IC_HDH_AQPNG_SETTINGS };
        return map[msgID] || ICs.IC_INVALID;
    }

    _emit(eventType, detail = {}) { this.dispatchEvent(new CustomEvent(eventType, { detail })); }
}