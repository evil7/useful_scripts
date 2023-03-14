class ComboKeys {
	constructor(comboCodes = [], interval = 1000, callback = () => {}) {
		this.comboCodes = comboCodes;
		this.interval = interval;
		this.callback = callback;
	}

	keyHandler(event) {
		const keySymbol = { keydown: '+', keyup: '-' };
		const newCode = keySymbol[event.type] + event.code;
		// pass repeat
		if (event.repeat) return;
		// debug
		if (this.debugger) console.log(event, newCode);
		// newCode check
		if (this.comboCodes[this.hitCodes.length] === newCode) {
			this.hitCodes.push(newCode);
			if (this.hitCodes.length === 1) {
				this.lastTime = new Date().getTime();
			} else if (this.hitCodes.length > 1) {
				const currentTime = new Date().getTime();
				if (currentTime - this.lastTime > this.interval) {
					this.hitCodes = [];
				} else {
					this.lastTime = currentTime;
				}
			}
		} else {
			this.hitCodes = [];
		}
		// combo finish & on time
		if (this.hitCodes.length === this.comboCodes.length) {
			this.hitCodes = [];
			this.limit--;
			this.preventDefault && event.preventDefault();
			this.callback && this.callback();
			if (this.limit === 0) this.off();
		}
	}

	do(callback, preventDefault = true) {
		this.preventDefault = preventDefault;
		this.callback = callback;
		return this;
	}

	on(limit = Infinity) {
		this.hitCodes = [];
		this.lastTime = 0;
		this.limit = limit;
		this.handler = (ev) => this.keyHandler(ev);
		document.addEventListener('keydown', this.handler);
		document.addEventListener('keyup', this.handler);
		return this;
	}

	off() {
		document.removeEventListener('keydown', this.handler);
		document.removeEventListener('keyup', this.handler);
		delete this.hitCodes;
		delete this.lastTime;
		delete this.limit;
		delete this.preventDefault;
		delete this.handler;
		return this;
	}

	debug(isDebug = true) {
		this.debugger = isDebug;
		return this;
	}
}
