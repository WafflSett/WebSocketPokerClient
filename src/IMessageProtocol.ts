export default interface IMessageProtocol {
    type: string,
    userId: number,
    userName?: string,
    text?: string,
    userList?: { userId: number, userName: string, position: number }[],
    tableId?: number,
    position?: number,
    dealer?: number,
    hand?: string[],
    pot?: number,
    runningBet?: number,
    bet?: number
}