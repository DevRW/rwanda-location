class ResponseSpec {
  /**
   * @description handles good response message
   *
   * @param {object} response
   * @param {number} status
   * @param {string} message
   * @param {object} data
   *
   * @returns {object} response
   */
  static good = (response, status, message, data) => (
    response.status(status)
      .json({
        status,
        message,
        data,
      })
  )

  /**
   * @description handles good response message
   *
   * @param {object} response
   * @param {number} status
   * @param {string} error
   *
   * @returns {object} response
   */
  static bad = (response, status, error) => (
    response.status(status)
      .json({
        status,
        error,
      })
  )
}

export default ResponseSpec;
