export class Alert {
    type: AlertType;
    message: string;
    hideAfterMs: number;
}

export enum AlertType {
    Success,
    Error,
    Info,
    Warning
}