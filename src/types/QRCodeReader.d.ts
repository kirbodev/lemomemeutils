declare module "qrcode-reader" {
  export default class QRCode {
    public callback: (err: unknown, value: { result: string | null }) => void;
    public decode: (bitmap: unknown) => void;
  }
}
