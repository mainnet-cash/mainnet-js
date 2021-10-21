extern crate qrcode;
extern crate wasm_bindgen;

use qrcode::render::svg;
use qrcode::QrCode;
use wasm_bindgen::prelude::*;

/// Generate the QR code as an SVG xml string
#[wasm_bindgen]
pub fn encode_svg(input: String) -> String {
    // Encode user input into bits.
    let code = QrCode::new(input).unwrap();

    // Render an SVG, return it as a String
    code.render::<svg::Color>().min_dimensions(200, 200).build()
}

#[cfg(test)]
mod tests {
    use crate::encode_svg;

    #[test]
    fn it_works() {
        let text = r##"<?xml version="1.0" standalone="yes"?><svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="203" height="203" viewBox="0 0 203 203" shape-rendering="crispEdges"><rect x="0" y="0" width="203" height="203" fill="#fff"/><path fill="#000" d="M28 28h7v7H28V28M35 28h7v7H35V28M42 28h7v7H42V28M49 28h7v7H49V28M56 28h7v7H56V28M63 28h7v7H63V28M70 28h7v7H70V28M91 28h7v7H91V28M98 28h7v7H98V28M126 28h7v7H126V28M133 28h7v7H133V28M140 28h7v7H140V28M147 28h7v7H147V28M154 28h7v7H154V28M161 28h7v7H161V28M168 28h7v7H168V28M28 35h7v7H28V35M70 35h7v7H70V35M91 35h7v7H91V35M98 35h7v7H98V35M126 35h7v7H126V35M168 35h7v7H168V35M28 42h7v7H28V42M42 42h7v7H42V42M49 42h7v7H49V42M56 42h7v7H56V42M70 42h7v7H70V42M91 42h7v7H91V42M112 42h7v7H112V42M126 42h7v7H126V42M140 42h7v7H140V42M147 42h7v7H147V42M154 42h7v7H154V42M168 42h7v7H168V42M28 49h7v7H28V49M42 49h7v7H42V49M49 49h7v7H49V49M56 49h7v7H56V49M70 49h7v7H70V49M98 49h7v7H98V49M105 49h7v7H105V49M126 49h7v7H126V49M140 49h7v7H140V49M147 49h7v7H147V49M154 49h7v7H154V49M168 49h7v7H168V49M28 56h7v7H28V56M42 56h7v7H42V56M49 56h7v7H49V56M56 56h7v7H56V56M70 56h7v7H70V56M91 56h7v7H91V56M98 56h7v7H98V56M112 56h7v7H112V56M126 56h7v7H126V56M140 56h7v7H140V56M147 56h7v7H147V56M154 56h7v7H154V56M168 56h7v7H168V56M28 63h7v7H28V63M70 63h7v7H70V63M84 63h7v7H84V63M105 63h7v7H105V63M112 63h7v7H112V63M126 63h7v7H126V63M168 63h7v7H168V63M28 70h7v7H28V70M35 70h7v7H35V70M42 70h7v7H42V70M49 70h7v7H49V70M56 70h7v7H56V70M63 70h7v7H63V70M70 70h7v7H70V70M84 70h7v7H84V70M98 70h7v7H98V70M112 70h7v7H112V70M126 70h7v7H126V70M133 70h7v7H133V70M140 70h7v7H140V70M147 70h7v7H147V70M154 70h7v7H154V70M161 70h7v7H161V70M168 70h7v7H168V70M105 77h7v7H105V77M112 77h7v7H112V77M28 84h7v7H28V84M49 84h7v7H49V84M63 84h7v7H63V84M70 84h7v7H70V84M84 84h7v7H84V84M91 84h7v7H91V84M119 84h7v7H119V84M133 84h7v7H133V84M42 91h7v7H42V91M56 91h7v7H56V91M63 91h7v7H63V91M98 91h7v7H98V91M126 91h7v7H126V91M161 91h7v7H161V91M168 91h7v7H168V91M49 98h7v7H49V98M56 98h7v7H56V98M70 98h7v7H70V98M77 98h7v7H77V98M84 98h7v7H84V98M91 98h7v7H91V98M112 98h7v7H112V98M119 98h7v7H119V98M147 98h7v7H147V98M154 98h7v7H154V98M168 98h7v7H168V98M28 105h7v7H28V105M35 105h7v7H35V105M42 105h7v7H42V105M56 105h7v7H56V105M63 105h7v7H63V105M84 105h7v7H84V105M105 105h7v7H105V105M147 105h7v7H147V105M161 105h7v7H161V105M168 105h7v7H168V105M35 112h7v7H35V112M42 112h7v7H42V112M56 112h7v7H56V112M70 112h7v7H70V112M77 112h7v7H77V112M98 112h7v7H98V112M112 112h7v7H112V112M126 112h7v7H126V112M140 112h7v7H140V112M84 119h7v7H84V119M91 119h7v7H91V119M105 119h7v7H105V119M133 119h7v7H133V119M140 119h7v7H140V119M154 119h7v7H154V119M168 119h7v7H168V119M28 126h7v7H28V126M35 126h7v7H35V126M42 126h7v7H42V126M49 126h7v7H49V126M56 126h7v7H56V126M63 126h7v7H63V126M70 126h7v7H70V126M98 126h7v7H98V126M119 126h7v7H119V126M133 126h7v7H133V126M147 126h7v7H147V126M154 126h7v7H154V126M161 126h7v7H161V126M28 133h7v7H28V133M70 133h7v7H70V133M84 133h7v7H84V133M98 133h7v7H98V133M105 133h7v7H105V133M112 133h7v7H112V133M119 133h7v7H119V133M133 133h7v7H133V133M140 133h7v7H140V133M28 140h7v7H28V140M42 140h7v7H42V140M49 140h7v7H49V140M56 140h7v7H56V140M70 140h7v7H70V140M105 140h7v7H105V140M126 140h7v7H126V140M133 140h7v7H133V140M140 140h7v7H140V140M168 140h7v7H168V140M28 147h7v7H28V147M42 147h7v7H42V147M49 147h7v7H49V147M56 147h7v7H56V147M70 147h7v7H70V147M84 147h7v7H84V147M91 147h7v7H91V147M105 147h7v7H105V147M133 147h7v7H133V147M147 147h7v7H147V147M154 147h7v7H154V147M161 147h7v7H161V147M168 147h7v7H168V147M28 154h7v7H28V154M42 154h7v7H42V154M49 154h7v7H49V154M56 154h7v7H56V154M70 154h7v7H70V154M91 154h7v7H91V154M98 154h7v7H98V154M112 154h7v7H112V154M140 154h7v7H140V154M154 154h7v7H154V154M168 154h7v7H168V154M28 161h7v7H28V161M70 161h7v7H70V161M91 161h7v7H91V161M98 161h7v7H98V161M119 161h7v7H119V161M126 161h7v7H126V161M28 168h7v7H28V168M35 168h7v7H35V168M42 168h7v7H42V168M49 168h7v7H49V168M56 168h7v7H56V168M63 168h7v7H63V168M70 168h7v7H70V168M84 168h7v7H84V168M91 168h7v7H91V168M98 168h7v7H98V168M105 168h7v7H105V168M112 168h7v7H112V168M133 168h7v7H133V168M147 168h7v7H147V168M161 168h7v7H161V168"/></svg>"##.to_string();
        assert_eq!(encode_svg("hello".to_string()), text);
    }
}