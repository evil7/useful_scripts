class BingAI {
	constructor() {
		this.landingUrl = 'https://www.bing.com/favicon.ico'; // for cors and disabled 302 from www -> cn
		this.referrerUrl = 'https://www.bing.com/search'; // fake referrer
		this.createUrl = 'https://www.bing.com/turing/conversation/create';
		this.socketUrl = 'wss://sydney.bing.com/sydney/ChatHub';
		this.socket = null;
		this.config = {
			fetchRetry: 9, // fetch with retry (if 302 www -> cn happend then you need it. fetch will pass the request every 7 redircts failed.)
			fetchOpts: { headers: { 'content-type': 'application/json' }, mode: 'cors', credentials: 'include', redirect: 'manual' },
			socketIdle: 1000 * 60 * 5,
			suffixCode: '\u001e',
			handshakeRule: [{ req: '{"protocol":"json","version":1}\u001e', res: '{}\u001e' }], // chat init
			handshakeSuccess: false,
			messageContinue: '{"type":6}\u001e',
			messageTrackedId: BingAI.generateRandom('hex', 32),
			messageTemplate: {
				arguments: [
					{
						source: 'cib',
						optionsSets: ['nlu_direct_response_filter', 'deepleo', 'disable_emoji_spoken_text', 'responsible_ai_policy_235', 'enablemm', 'harmonyv3', 'wlthrottle', 'h3toppfp3', 'dv3sugg'],
						allowedMessageTypes: ['Chat', 'InternalSearchQuery', 'InternalSearchResult', 'Disengaged', 'InternalLoaderMessage', 'RenderCardRequest', 'AdsQuery', 'SemanticSerp', 'GenerateContentQuery', 'SearchQuery'],
						sliceIds: ['perfinsttf', 'perftrk', 'linkimgincf', '228h3adss0', 'h3adss0', '0310wlthrot', '0228cache', 'ssoverlap50', 'ssplon', 'sssreduce', 'sswebtop2', '302blcklists0', '308disbings0', '311h3toppfp3'],
						traceId: '',
						isStartOfSession: true,
						message: {
							timestamp: '',
							author: 'user',
							inputMethod: 'Keyboard',
							text: '',
							messageType: 'Chat',
						},
						conversationSignature: '',
						participant: { id: '' },
						conversationId: '',
					},
				],
				invocationId: '0',
				target: 'chat',
				type: 4,
			},
			requestHander: null,
			responseHandler: null,
		};
	}

	// fetch with retry
	static async _fetch(url, options, retryCount) {
		const res = await fetch(url, options);
		if (res && res.ok) {
			return res;
		} else if (retryCount > 0) {
			return BingAI._fetch(url, options, retryCount - 1);
		}
	}

	// create session
	async createConversation() {
		this.invocationId = 0;
		try {
			const res = await BingAI._fetch(this.createUrl, this.config.fetchOpts, this.config.fetchRetry);
			const data = await res.json();
			if (data && data.result && data.result.value && data.result.value === 'Success') {
				this.conversationData = Object.assign({}, { invocationId: 0 }, data);
			} else {
				throw new Error('Some unkown response from `createConversation`', data);
			}
		} catch (e) {
			throw new Error('Retry limit exceeded');
		}
		return this;
	}

	async socketHandshake() {
		const socket = this.socket;
		const { handshakeRule, messageContinue } = this.config;
		for (const rule of handshakeRule) {
			const res = await new Promise((resolve) => {
				let timer = null;
				const listener = (e) => {
					if (e.data === rule.res) {
						clearTimeout(timer);
						socket.removeEventListener('message', listener);
						resolve(e.data);
					} else {
						throw new Error('Handshake failed: Incorrect response');
					}
				};
				timer = setTimeout(() => {
					socket.removeEventListener('message', listener);
					resolve(null);
				}, 3000);
				socket.addEventListener('message', listener);
				socket.send(rule.req);
			});
			if (!res) {
				throw new Error('Handshake failed: No response');
			}
		}
		console.log('[+] Handshake success.');
		this.config.handshakeSuccess = true;
		// done. start chat
		this.socket.send(messageContinue);
		return this;
	}

	// open WebSocket & handshake
	createSocket() {
		if (this.socket !== null) this.socket.close();
		// idle watchdog
		const socketWatchdog = setInterval(() => {
			if (this.socket && this.config.socketIdle !== -1 && Date.now() - this.config.socketLast > this.config.socketIdle) {
				console.log('[!] Idle timeout.');
				this.socket.close();
				clearInterval(socketWatchdog);
				delete this.config.socketLast;
			}
		});
		this.config.socketLast = Date.now();

		return new Promise((resolve, reject) => {
			this.socket = new WebSocket(this.socketUrl);
			this.socket.onopen = async () => {
				console.log('[+] WebSocket connected.');
				await this.socketHandshake();
				resolve(this);
			};
			this.socket.onmessage = (event) => {
				const { messageContinue, responseHandler } = this.config;
				if (this.config.handshakeSuccess && event.data !== messageContinue) {
					if (responseHandler) {
						responseHandler(event.data);
					} else {
						console.log('[<] Response:', event.data);
					}
				}
				if (event.data === messageContinue) this.socket.send(messageContinue);
			};
			this.socket.onerror = (error) => {
				console.error('[!] WebSocket error', error);
				reject(error);
			};
			this.socket.onclose = (event) => {
				console.log('[-] WebSocket is closed.', event.reason);
				this.socket = null;
			};
		});
	}

	static generateTimestamp() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hour = String(now.getHours()).padStart(2, '0');
		const minute = String(now.getMinutes()).padStart(2, '0');
		const second = String(now.getSeconds()).padStart(2, '0');
		const timezoneOffset = now.getTimezoneOffset();
		const timezoneHours = Math.abs(Math.floor(timezoneOffset / 60));
		const timezoneMinutes = Math.abs(timezoneOffset % 60);
		const timezoneSign = timezoneOffset > 0 ? '-' : '+';
		const timezoneHoursString = String(timezoneHours).padStart(2, '0');
		const timezoneMinutesString = String(timezoneMinutes).padStart(2, '0');
		return `${year}-${month}-${day}T${hour}:${minute}:${second}${timezoneSign}${timezoneHoursString}:${timezoneMinutesString}`;
	}

	static generateRandom(type = 'hex', len = 32) {
		let result = '';
		const characters = {
			hex: '0123456789abcdef',
			uuid: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
			pwd: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:,.<>/?',
			num: '0123456789',
		};
		const charactersLength = characters[type].length;
		if (type === 'uuid') {
			result = characters[type].replace(/[xy]/g, function (c) {
				const r = (Math.random() * 16) | 0;
				const v = c === 'x' ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			});
		} else {
			for (let i = 0; i < len; i++) {
				result += characters[type].charAt(Math.floor(Math.random() * charactersLength));
			}
		}
		return result;
	}

	// genrate chat message
	generateMessage(text) {
		const { messageTemplate, suffixCode, messageTrackedId } = this.config;
		const { conversationSignature, clientId, conversationId, invocationId } = this.conversationData;
		const data = Object.assign({}, messageTemplate);
		data.arguments[0].message.text = text;
		data.arguments[0].message.timestamp = BingAI.generateTimestamp();
		data.arguments[0].traceId = messageTrackedId;
		data.arguments[0].conversationSignature = conversationSignature;
		data.arguments[0].participant.id = clientId;
		data.arguments[0].conversationId = conversationId;
		data.arguments[0].isStartOfSession = !invocationId;
		data.invocationId = invocationId.toString();
		return JSON.stringify(data) + suffixCode;
	}

	send(text) {
		if (!text) return;
		if (!this.socket) this.createSocket().then(() => this.send(text));
		const { requestHander } = this.config;
		if (requestHander) {
			requestHander(text);
		} else {
			const message = this.generateMessage(text);
			this.socket.send(message);
			this.config.socketLast = Date.now();
			this.conversationData.invocationId = parseInt(this.conversationData.invocationId) + 1;
			console.log('[>] Send:', message);
		}
	}

	async init() {
		this.socket && this.socket.close();
		await this.createConversation();
		await this.createSocket();
		console.log('[+] BingAI inited.');
		return this;
	}
}

// You can test it in browser but must running under `https://www.bing.com/favicon.ico` page maybe. (cors will stop fetch)
// It's better if use it in an extension :)

// usage:

const bingAI = new BingAI();
await bingAI.init().then(() => {
	bingAI.config.responseHandler = (result) => {
		result = result.slice(0, event.data.length - 1).split(bingAI.config.suffixCode);
		result.forEach((data) => {
			data = JSON.parse(data);
			if (data.type === 1 && data.target === 'update' && data.arguments[0].messages && data.arguments[0].messages[0].author === 'bot') {
				console.log(data.arguments[0].messages[0].text);
			}
		});
	};
	bingAI.send('北京明天会下雨吗');
});
