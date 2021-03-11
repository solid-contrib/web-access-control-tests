import { getAuthHeaders } from "solid-auth-fetcher";

const WebSocket = require('ws');

export class WPSClient {
  received: string[];
  sent: string[];
  resourceUrl: string;
  authFetcher;
  ws;
  constructor (resourceUrl: string, authFetcher) {
    this.received = [];
    this.sent = [];
    this.resourceUrl = resourceUrl;
    this.authFetcher = authFetcher;
  }
  async getReady() {
    const result = await this.authFetcher.fetch(this.resourceUrl, { method: 'HEAD' })
    const wssUrl = result.headers.get('updates-via');
    this.ws = new WebSocket(wssUrl, {
      perMessageDeflate: false
    });
    this.ws.on('message', (msg) => {
      // console.log('WS <', msg);
      this.received.push(msg);
    });  
    await new Promise<void>((resolve) => {
      this.ws.on('open', async () => {
        const authHeaders = await getAuthHeaders(this.resourceUrl, 'GET', this.authFetcher);
        await this.send(`sub ${this.resourceUrl}`);
        await this.send(`auth ${authHeaders.Authorization}`);
        await this.send(`dpop ${authHeaders.DPop}`);
        resolve();
      });
    });
  }
  // NB: this will fail if you didn't await getReady first:
  send(str) {
    // console.log('WS > ', str);
    this.sent.push(str);
    return new Promise(resolve => this.ws.send(str, resolve));
  }
  disconnect() {
    if (this.ws) {
      this.ws.terminate();
      delete this.ws;
    }
  }
}

export function responseCodeGroup(code) {
  return `${Math.floor(code / 100)}xx`;
}

// env param is skip for MUST and SHOULD, include for MAY
export function itIs(level ='', id = '') {
  switch (level) {
    case 'SKIP':
      return (name, runner) => { it.skip(`${level} ${id} ${name}`, runner); }
    case 'MUST':
      if (process.env.SKIP_MUST || process.env['SKIP_MUST_' + id]) {
          return (name, runner) => { it.skip(`${level} ${id} ${name}`, runner); }
      } else {
          return (name, runner) => { it(`${level} ${id} ${name}`, runner); }
      }
    case 'SHOULD':
      if (process.env.SKIP_SHOULD || process.env['SKIP_SHOULD_' + id]) {
        return (name, runner) => { it.skip(`${level} ${id} ${name}`, runner); }
      } else {
        return (name, runner) => { it(`${level} ${id} ${name}`, runner); }
      }
    case 'MAY':
      if (process.env.INCLUDE_MAY || process.env['INCLUDE_MAY_' + id]) {
        return (name, runner) => { it(`${level} ${id} ${name}`, runner); }
      } else {
        return (name, runner) => { it.skip(`${level} ${id} ${name}`, runner); }
      }
  }
  return (name, runner) => { it(`${level} ${id} ${name}`, runner); }
}
