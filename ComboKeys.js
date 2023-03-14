class ComboKeys {
	constructor(comboCodes = [], interval = 1000, callback = () => { }, domBase = document) {
		this.comboCodes = comboCodes;
		this.interval = interval;
		this.callback = callback;
		this.domBase = domBase;
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

	code(newCodes = []) {
		if (newCodes.length > 0) this.comboCodes = newCodes;
		return this;
	}

	limit(interval = 1000) {
		this.interval = interval;
		return this;
	}

	do(callback, preventDefault = true) {
		this.preventDefault = preventDefault;
		this.callback = callback;
		return this;
	}

	at(domBase = document) {
		this.domBase = domBase;
		return this;
	}

	on(limit = Infinity) {
		this.hitCodes = [];
		this.lastTime = 0;
		this.limit = limit;
		this.handler = (ev) => this.keyHandler(ev);
		this.domBase.addEventListener('keydown', this.handler);
		this.domBase.addEventListener('keyup', this.handler);
		return this;
	}

	off(cleanup = false) {
		this.domBase.removeEventListener('keydown', this.handler);
		this.domBase.removeEventListener('keyup', this.handler);
		if (cleanup) {
				delete this.hitCodes;
				delete this.lastTime;
				delete this.preventDefault;
				delete this.handler;
				delete this.debugger;
		}
		return this;
	}

	debug(isDebug = true) {
		this.debugger = isDebug;
		return this;
	}
}
