import crypto from 'crypto';

export interface WalletI {
  id?: number;
  name: string;
  wallet: string;
}

export interface WebHookI {
  id?: number;
  address: string;
  type: string;
  recurrence: string;
  hook_url: string;
  status: string;
  last_tx: string;
  expires_at: Date;
  hash: string;
}

export class WebHook implements WebHookI {
  id?: number;
  address: string;
  type: string;
  recurrence: string;
  hook_url: string;
  status: string;
  last_tx: string;
  expires_at: Date;
  hash: string;

  constructor(params: any) {
    this.id = params['id'] || null;
    this.address = params['address'] || "";
    this.type = params['type'] || "";
    this.recurrence = params['recurrence'] || "";
    this.hook_url = params['hook_url'] || "";
    this.status = params['status'] || "";
    this.last_tx = params['last_tx'] || "";
    this.expires_at = params['expires_at'] || new Date();
    this.hash = this.calcHash();
  }

  calcHash(): string {
    let data = this.address + this.type + this.recurrence + this.hook_url;
    return crypto.createHash('sha1').update(data).digest('base64');
  }
}