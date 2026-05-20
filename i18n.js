// i18n.js — Localization for uWaver

const I18n = {
    _lang: 'ru',
    _translations: {
        ru: {
            // Footer
            org_name: '(C) UC&NL',
            footer_desc: 'Open Source Configuration Tool',

            // Status
            status_connected: 'Подключено',
            status_disconnected: 'Отключено',
            status_busy: 'Занято',

            // Connection
            connection_title: 'Подключение',
            connect: 'Подключить',
            disconnect: 'Отключить',
            device_not_selected: 'Устройство не выбрано',
            device_connected: 'Устройство подключено',
            auto_connecting: 'Поиск устройства...',

            // Device Info
            device_info_title: 'Информация об устройстве',
            dev_system: 'Система:',
            dev_baudrate: 'Акустический baudrate:',
            dev_total_ch: 'Всего каналов:',
            query_device_info: 'Запросить информацию',

            // Tabs
            tab_settings: 'Настройки',
            tab_remote: 'Удалённые запросы',
            tab_packet: 'Пакетный режим',
            tab_sensors: 'Локальные сенсоры',

            // Device Settings
            dev_settings_title: 'Основные настройки',
            tx_channel: 'TX канал:',
            rx_channel: 'RX канал:',
            salinity: 'Солёность (PSU):',
            gravity: 'Гравитация (м/с²):',
            cmd_mode_default: 'Command Mode по умолчанию',
            ack_on_tx: 'ACK по завершению передачи',
            btn_defaults: 'По умолчанию',
            btn_apply: 'Применить',

            // Remote Requests
            rc_title: 'Удалённые запросы (Remote Control)',
            command: 'Команда:',
            btn_send_request: 'Отправить запрос',
            auto_mode: 'Авто-режим',
            auto_mode_off: 'Авто-режим: ВЫКЛ',
            auto_mode_on: '✔ Авто-режим:',
            statistics: 'Статистика',
            no_data: 'Нет данных',
            btn_clear: 'Очистить',
            rc_log: 'Лог запросов',
            btn_copy: 'Копировать',
            autoscroll: 'Автопрокрутка',

            // Packet Mode
            pt_title: 'Пакетный режим (Packet Mode)',
            pt_settings: 'Настройки',
            local_address: 'Локальный адрес:',
            save_to_flash: 'Сохранить во flash',
            btn_query_settings: 'Запросить настройки',
            pt_telemetry: 'Запрос телеметрии (PT-ITG)',
            target_address: 'Целевой адрес:',
            data_type: 'Тип данных:',
            did_dpt: 'DID_DPT (глубина)',
            did_tmp: 'DID_TMP (температура)',
            did_bat: 'DID_BAT (напряжение)',
            pt_send_packet: 'Передача пакета',
            tries: 'Попыток:',
            packet_data: 'Данные (ASCII, макс. 64 байта):',
            btn_send_packet: 'Отправить пакет',
            btn_abort: 'Прервать отправку',
            pt_log: 'Лог пакетного режима',

            // Local Sensors
            sensors_title: 'Локальные сенсоры',
            sensors_current: 'Текущие показания',
            pressure: 'Давление',
            temperature: 'Температура',
            depth: 'Глубина',
            voltage: 'Напряжение',
            sensors: 'Датчики:',
            sensors_cfg1: 'Настройка опроса (давление, температура, глубина, напр.)',
            sensors_cfg2: 'Настройка опроса (pitch, roll)',
            poll_period: 'Период опроса:',
            never: 'NEVER',

            // AQPNG
            mode: 'Режим:',
            period_ms: 'Период (мс):',
            rc_tx_channel: 'RC TX канал:',
            rc_rx_channel: 'RC RX канал:',
            pt_mode: 'Пакетный режим (PT)',
            pt_target_address: 'PT Target адрес:',

            // Log
            log_title: 'Лог обмена',
            log_ready: 'Готов к работе...',

            // Dynamic messages
            msg_connecting: 'Подключение...',
            msg_connected: 'Порт открыт, ожидание ответа устройства...',
            msg_connect_error: 'Ошибка подключения: ',
            msg_settings_saved: 'Настройки сохранены успешно',
            msg_device_info_ok: 'Информация об устройстве получена',
            msg_pt_request_sent: 'Запрос отправлен, ожидание ответа...',
            msg_auto_start: 'REMREQ AUTO ({0}) START',
            msg_auto_stop: 'REMREQ AUTO STOP',
            msg_auto_done: 'Выполнено {0} запросов.',
            msg_pt_settings_ok: 'Настройки PT получены: addr={0}, PT mode={1}',
            msg_pt_apply: 'Применение PT настроек: addr={0}, saveFlash={1}',
            msg_pt_packet: '#{0} << "{1}" ({2} попыток) ?...',
            msg_pt_abort: 'ABORT SEND ?...',
            msg_pt_ok: '#{0} << OK (попыток: {1})',
            msg_pt_failed: '#{0} << FAILED (попыток: {1})',
            msg_pt_timeout: '#{0} >> {1} Timeout',
            msg_ls1_applied: 'LS1: period={0}, P={1}, T={2}, D={3}, V={4}',
            msg_ls2_applied: 'LS2 (Pitch/Roll): period={0}',
            msg_aqpng_applied: 'AQPNG: mode={0}, period={1}, dataID={2}, Tx={3}, Rx={4}, PT={5}',
            msg_aqpng_settings_ok: 'AQPNG настройки получены',
            msg_apply_settings: 'Применение настроек: Tx={0}, Rx={1}, Sal={2}, CmdDef={3}, AckTx={4}, Grav={5}',
            msg_copied: 'Лог скопирован в буфер обмена',
            msg_copy_failed: 'Не удалось скопировать лог',
            msg_port_closed: 'Порт закрыт',
            msg_rc_busy: 'Невозможно выполнить запрос — ожидание предыдущего',
            msg_packet_too_large: 'Данные превышают 64 байта',
			
			bytes: 'байт',
        },

        en: {
            // Footer
            org_name: '(C) UC&NL',
            footer_desc: 'Open Source Configuration Tool',

            // Status
            status_connected: 'Connected',
            status_disconnected: 'Disconnected',
            status_busy: 'Busy',

            // Connection
            connection_title: 'Connection',
            connect: 'Connect',
            disconnect: 'Disconnect',
            device_not_selected: 'Device not selected',
            device_connected: 'Device connected',
            auto_connecting: 'Searching...',

            // Device Info
            device_info_title: 'Device Information',
            dev_system: 'System:',
            dev_baudrate: 'Acoustic baudrate:',
            dev_total_ch: 'Total channels:',
            query_device_info: 'Query Device Info',

            // Tabs
            tab_settings: 'Settings',
            tab_remote: 'Remote Requests',
            tab_packet: 'Packet Mode',
            tab_sensors: 'Local Sensors',

            // Device Settings
            dev_settings_title: 'Device Settings',
            tx_channel: 'TX channel:',
            rx_channel: 'RX channel:',
            salinity: 'Salinity (PSU):',
            gravity: 'Gravity (m/s²):',
            cmd_mode_default: 'Command Mode by default',
            ack_on_tx: 'ACK on TX finished',
            btn_defaults: 'Defaults',
            btn_apply: 'Apply',

            // Remote Requests
            rc_title: 'Remote Requests (Remote Control)',
            command: 'Command:',
            btn_send_request: 'Send Request',
            auto_mode: 'Auto Mode',
            auto_mode_off: 'Auto Mode: OFF',
            auto_mode_on: '✔ Auto Mode:',
            statistics: 'Statistics',
            no_data: 'No data',
            btn_clear: 'Clear',
            rc_log: 'Request Log',
            btn_copy: 'Copy',
            autoscroll: 'Autoscroll',

            // Packet Mode
            pt_title: 'Packet Mode',
            pt_settings: 'Settings',
            local_address: 'Local address:',
            save_to_flash: 'Save to flash',
            btn_query_settings: 'Query Settings',
            pt_telemetry: 'Telemetry Request (PT-ITG)',
            target_address: 'Target address:',
            data_type: 'Data type:',
            did_dpt: 'DID_DPT (depth)',
            did_tmp: 'DID_TMP (temperature)',
            did_bat: 'DID_BAT (voltage)',
            pt_send_packet: 'Send Packet',
            tries: 'Tries:',
            packet_data: 'Data (ASCII, max. 64 bytes):',
            btn_send_packet: 'Send Packet',
            btn_abort: 'Abort',
            pt_log: 'Packet Log',

            // Local Sensors
            sensors_title: 'Local Sensors',
            sensors_current: 'Current Readings',
            pressure: 'Pressure',
            temperature: 'Temperature',
            depth: 'Depth',
            voltage: 'Voltage',
            sensors: 'Sensors:',
            sensors_cfg1: 'Polling Setup (pressure, temperature, depth, voltage)',
            sensors_cfg2: 'Polling Setup (pitch, roll)',
            poll_period: 'Poll period:',
            never: 'NEVER',

            // AQPNG
            mode: 'Mode:',
            period_ms: 'Period (ms):',
            rc_tx_channel: 'RC TX channel:',
            rc_rx_channel: 'RC RX channel:',
            pt_mode: 'Packet Mode (PT)',
            pt_target_address: 'PT Target address:',

            // Log
            log_title: 'Exchange Log',
            log_ready: 'Ready...',

            // Dynamic messages
            msg_connecting: 'Connecting...',
            msg_connected: 'Port opened, waiting for device...',
            msg_connect_error: 'Connection error: ',
            msg_settings_saved: 'Settings saved successfully',
            msg_device_info_ok: 'Device information received',
            msg_pt_request_sent: 'Request sent, waiting for response...',
            msg_auto_start: 'REMREQ AUTO ({0}) START',
            msg_auto_stop: 'REMREQ AUTO STOP',
            msg_auto_done: '{0} requests completed.',
            msg_pt_settings_ok: 'PT settings received: addr={0}, PT mode={1}',
            msg_pt_apply: 'Applying PT settings: addr={0}, saveFlash={1}',
            msg_pt_packet: '#{0} << "{1}" ({2} tries) ?...',
            msg_pt_abort: 'ABORT SEND ?...',
            msg_pt_ok: '#{0} << OK ({1} tries)',
            msg_pt_failed: '#{0} << FAILED ({1} tries)',
            msg_pt_timeout: '#{0} >> {1} Timeout',
            msg_ls1_applied: 'LS1: period={0}, P={1}, T={2}, D={3}, V={4}',
            msg_ls2_applied: 'LS2 (Pitch/Roll): period={0}',
            msg_aqpng_applied: 'AQPNG: mode={0}, period={1}, dataID={2}, Tx={3}, Rx={4}, PT={5}',
            msg_aqpng_settings_ok: 'AQPNG settings received',
            msg_apply_settings: 'Applying settings: Tx={0}, Rx={1}, Sal={2}, CmdDef={3}, AckTx={4}, Grav={5}',
            msg_copied: 'Log copied to clipboard',
            msg_copy_failed: 'Failed to copy log',
            msg_port_closed: 'Port closed',
            msg_rc_busy: 'Cannot perform request — waiting for previous',
            msg_packet_too_large: 'Data exceeds 64 bytes',
			
			bytes: 'bytes',
        }
    },

    setLanguage(lang) {
        if (this._translations[lang]) {
            this._lang = lang;
            this.apply();
        }
    },

    translate(key, ...args) {
        let text = this._translations[this._lang]?.[key] || this._translations['en']?.[key] || key;
        args.forEach((arg, i) => {
            text = text.replace(`{${i}}`, arg);
        });
        return text;
    },

    apply() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.translate(key);
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    I18n.apply();
});