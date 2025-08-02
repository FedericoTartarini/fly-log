import unittest

from python.flight_analysis import get_airport_coordinates


class TestGetAirportCoordinates(unittest.TestCase):
    def test_valid_iata_code_jfk(self):
        coords = get_airport_coordinates("JFK")
        self.assertAlmostEqual(float(coords[0]), 40.6413, places=2)
        self.assertAlmostEqual(float(coords[1]), -73.7781, places=2)

    def test_valid_iata_code_syd(self):
        coords = get_airport_coordinates("SYD")
        self.assertAlmostEqual(float(coords[0]), -33.94609833, places=2)
        self.assertAlmostEqual(float(coords[1]), 151.177002, places=2)

    def test_invalid_iata_code(self):
        coords = get_airport_coordinates("XXX")
        self.assertIsNone(coords)


if __name__ == "__main__":
    unittest.main()
