export class Service {
  static rejectResponse(error: any, code = 500) {
    return { error, code };
  }

  static successResponse(payload: any, code = 200) {
    return { payload, code };
  }
}
