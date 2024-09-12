export const checkResponse = (response) => {
  if (response.status !== 200) {
    throw new Error(`Request failed with HTTP code ${response.status}\n${JSON.stringify(response.body, null, 2)}`);
  }
}