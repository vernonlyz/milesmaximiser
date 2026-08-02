-- MilesMaximiser — MCC catalogue seed
-- Run after migration 012. Idempotent — re-running applies corrections.
--
-- Category IDs (from initial seed + migrations):
--   001=Dining  002=Groceries  003=Petrol  004=Online Shopping
--   005=Overseas/FCY  006=Travel  007=Entertainment  008=Transport
--   009=Utilities & Bills  010=Others  011=Fashion  012=Beauty

INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES

-- ── Dining (001) ─────────────────────────────────────────────────────────────
('5811', 'Caterers',                              '00000000-0000-0000-0000-000000000001'),
('5812', 'Eating Places, Restaurants',            '00000000-0000-0000-0000-000000000001'),
('5813', 'Drinking Places, Bars',                 '00000000-0000-0000-0000-000000000001'),
('5814', 'Fast Food Restaurants',                 '00000000-0000-0000-0000-000000000001'),

-- ── Groceries (002) ──────────────────────────────────────────────────────────
('5411', 'Grocery Stores, Supermarkets',          '00000000-0000-0000-0000-000000000002'),
('5422', 'Freezer and Locker Meat Provisioners',  '00000000-0000-0000-0000-000000000002'),
('5441', 'Candy, Nut and Confectionery Stores',   '00000000-0000-0000-0000-000000000002'),
('5451', 'Dairy Products Stores',                 '00000000-0000-0000-0000-000000000002'),
('5462', 'Bakeries',                              '00000000-0000-0000-0000-000000000002'),
('5499', 'Miscellaneous Food Stores',             '00000000-0000-0000-0000-000000000002'),

-- ── Petrol (003) ─────────────────────────────────────────────────────────────
('5541', 'Service Stations, Gas Stations',        '00000000-0000-0000-0000-000000000003'),
('5542', 'Automated Fuel Dispensers',             '00000000-0000-0000-0000-000000000003'),

-- ── Online Shopping (004) ────────────────────────────────────────────────────
('5045', 'Computers, Peripherals and Software',   '00000000-0000-0000-0000-000000000004'),
('5734', 'Computer Software Stores',              '00000000-0000-0000-0000-000000000004'),
('5815', 'Digital Goods: Audio-Visual Media',     '00000000-0000-0000-0000-000000000004'),
('5816', 'Digital Goods: Games',                  '00000000-0000-0000-0000-000000000004'),
('5817', 'Digital Goods: Applications',           '00000000-0000-0000-0000-000000000004'),
('5818', 'Digital Goods: Large Merchants',        '00000000-0000-0000-0000-000000000004'),
('5311', 'Department Stores',                     '00000000-0000-0000-0000-000000000004'),
('5331', 'Variety Stores',                        '00000000-0000-0000-0000-000000000004'),
('5999', 'Misc and Specialty Retail Stores',      '00000000-0000-0000-0000-000000000004'),

-- ── Travel (006) ─────────────────────────────────────────────────────────────
-- Note: 005 = Overseas/FCY (currency-based, not merchant-type based)
-- Use 006 for travel MCCs (airlines, hotels, travel agencies)
('4411', 'Cruise Lines',                          '00000000-0000-0000-0000-000000000006'),
('4511', 'Airlines, Air Carriers',                '00000000-0000-0000-0000-000000000006'),
('4722', 'Travel Agencies, Tour Operators',       '00000000-0000-0000-0000-000000000006'),
('4723', 'Package Tour Operators',                '00000000-0000-0000-0000-000000000006'),
('7011', 'Hotels, Motels, Resorts',               '00000000-0000-0000-0000-000000000006'),
('7012', 'Timeshares',                            '00000000-0000-0000-0000-000000000006'),
('7032', 'Sporting and Recreational Camps',       '00000000-0000-0000-0000-000000000006'),
('7033', 'Trailer Parks and Campgrounds',         '00000000-0000-0000-0000-000000000006'),

-- ── Transport (008) ──────────────────────────────────────────────────────────
('4111', 'Local and Suburban Commuter Transport', '00000000-0000-0000-0000-000000000008'),
('4121', 'Taxicabs and Ride-hailing Services',    '00000000-0000-0000-0000-000000000008'),
('4131', 'Bus Lines',                             '00000000-0000-0000-0000-000000000008'),
('4789', 'Transportation Services',               '00000000-0000-0000-0000-000000000008'),
('7512', 'Automobile Rental Agency',              '00000000-0000-0000-0000-000000000008'),
('7513', 'Truck and Utility Trailer Rentals',     '00000000-0000-0000-0000-000000000008'),

-- ── Entertainment (007) ──────────────────────────────────────────────────────
('5945', 'Hobby, Toy and Game Shops',             '00000000-0000-0000-0000-000000000007'),
('7832', 'Motion Picture Theaters',               '00000000-0000-0000-0000-000000000007'),
('7922', 'Theatrical Ticket Agencies',            '00000000-0000-0000-0000-000000000007'),
('7929', 'Bands, Orchestras, Entertainers',       '00000000-0000-0000-0000-000000000007'),
('7933', 'Bowling Alleys',                        '00000000-0000-0000-0000-000000000007'),
('7941', 'Athletic Fields, Sports Clubs',         '00000000-0000-0000-0000-000000000007'),
('7991', 'Tourist Attractions and Exhibits',      '00000000-0000-0000-0000-000000000007'),
('7993', 'Video Amusement Game Supplies',         '00000000-0000-0000-0000-000000000007'),
('7994', 'Video Game Arcades',                    '00000000-0000-0000-0000-000000000007'),
('7996', 'Amusement Parks, Carnivals',            '00000000-0000-0000-0000-000000000007'),
('7997', 'Membership Clubs, Sports and Recreation','00000000-0000-0000-0000-000000000007'),
('7999', 'Recreation Services',                   '00000000-0000-0000-0000-000000000007'),

-- ── Utilities & Bills (009) ──────────────────────────────────────────────────
('4811', 'Telephone Communications',              '00000000-0000-0000-0000-000000000009'),
('4812', 'Telephone Equipment',                   '00000000-0000-0000-0000-000000000009'),
('4813', 'Telephone Communications (incl. fax)',  '00000000-0000-0000-0000-000000000009'),
('4814', 'Telecommunications Services',           '00000000-0000-0000-0000-000000000009'),
('4899', 'Cable and Other Pay TV Services',       '00000000-0000-0000-0000-000000000009'),
('4900', 'Utilities',                             '00000000-0000-0000-0000-000000000009'),
('4911', 'Electric Services',                     '00000000-0000-0000-0000-000000000009'),
('4941', 'Water Supply',                          '00000000-0000-0000-0000-000000000009'),
('9222', 'Fines',                                 '00000000-0000-0000-0000-000000000009'),
('9311', 'Tax Payments',                          '00000000-0000-0000-0000-000000000009'),
('9399', 'Government Services',                   '00000000-0000-0000-0000-000000000009'),

-- ── Others (010) — general retail, healthcare, education, insurance ───────────
-- No generic "Shopping" category exists; non-food retail defaults to Others.
('5200', 'Home Supply Warehouse Stores',          '00000000-0000-0000-0000-000000000010'),
('5251', 'Hardware Stores',                       '00000000-0000-0000-0000-000000000010'),
('5399', 'Misc General Merchandise Stores',       '00000000-0000-0000-0000-000000000010'),
('5712', 'Furniture, Home Furnishings Stores',    '00000000-0000-0000-0000-000000000010'),
('5732', 'Electronics Stores',                    '00000000-0000-0000-0000-000000000010'),
('5912', 'Drug Stores and Pharmacies',            '00000000-0000-0000-0000-000000000010'),
('5940', 'Sporting Goods Stores',                 '00000000-0000-0000-0000-000000000010'),
('5941', 'Sporting Goods and Athletic Shops',     '00000000-0000-0000-0000-000000000010'),
('5942', 'Book Stores',                           '00000000-0000-0000-0000-000000000010'),
('5943', 'Stationery, Office and School Supplies','00000000-0000-0000-0000-000000000010'),
('5944', 'Jewelry, Watch, Clock and Silverware',  '00000000-0000-0000-0000-000000000010'),
('6300', 'Insurance Sales and Premiums',          '00000000-0000-0000-0000-000000000010'),
('6381', 'Insurance Premiums',                    '00000000-0000-0000-0000-000000000010'),
('7372', 'Computer Programming and Data Processing','00000000-0000-0000-0000-000000000010'),
('7399', 'Business Services, Not Elsewhere Classified','00000000-0000-0000-0000-000000000010'),
('8011', 'Doctors and Physicians',                '00000000-0000-0000-0000-000000000010'),
('8049', 'Chiropractors and Osteopaths',          '00000000-0000-0000-0000-000000000010'),
('8099', 'Health and Medical Services',           '00000000-0000-0000-0000-000000000010'),
('8211', 'Elementary and Secondary Schools',      '00000000-0000-0000-0000-000000000010'),
('8220', 'Colleges and Universities',             '00000000-0000-0000-0000-000000000010'),
('8299', 'Educational Services',                  '00000000-0000-0000-0000-000000000010'),
('9402', 'Postal Services',                       '00000000-0000-0000-0000-000000000010'),

-- ── Fashion (011) ────────────────────────────────────────────────────────────
('5611', 'Mens Clothing Stores',                  '00000000-0000-0000-0000-000000000011'),
('5621', 'Women''s Ready-to-Wear Stores',         '00000000-0000-0000-0000-000000000011'),
('5631', 'Women''s Accessory and Specialty Shops','00000000-0000-0000-0000-000000000011'),
('5641', 'Children''s and Infants'' Wear Stores', '00000000-0000-0000-0000-000000000011'),
('5651', 'Family Clothing Stores',                '00000000-0000-0000-0000-000000000011'),
('5661', 'Shoe Stores',                           '00000000-0000-0000-0000-000000000011'),
('5691', 'Men''s and Women''s Clothing Stores',   '00000000-0000-0000-0000-000000000011'),
('5699', 'Misc Apparel and Accessory Shops',      '00000000-0000-0000-0000-000000000011'),

-- ── Beauty (012) ─────────────────────────────────────────────────────────────
('5977', 'Cosmetic Stores',                       '00000000-0000-0000-0000-000000000012'),
('7230', 'Beauty Salons and Barber Shops',        '00000000-0000-0000-0000-000000000012'),
('7297', 'Massage Parlors',                       '00000000-0000-0000-0000-000000000012')

ON CONFLICT (code) DO UPDATE SET
  description         = EXCLUDED.description,
  default_category_id = EXCLUDED.default_category_id;


-- ─────────────────────────────────────────────────────────────────────────────
-- Additional MCC descriptions referenced by card_mcc_eligibility (migrations
-- 044–051, consolidated). DO NOTHING so canonical rows above are never clobbered
-- and codes already present are left untouched.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO mcc_catalogue (code, description, default_category_id) VALUES
  ('7231', 'Beauty and Barber Shops',                              '00000000-0000-0000-0000-000000000012'),
  ('7298', 'Health and Beauty Spas',                               '00000000-0000-0000-0000-000000000012'),
  ('5655', 'Sports and Riding Apparel Stores',                     '00000000-0000-0000-0000-000000000011'),
  ('5948', 'Luggage and Leather Goods Stores',                     '00000000-0000-0000-0000-000000000011'),
  ('4582', 'Airports, Flying Fields',                              '00000000-0000-0000-0000-000000000006'),
  ('5309', 'Duty Free Stores',                                     '00000000-0000-0000-0000-000000000006'),
  ('4816', 'Computer Network / Information Services',              '00000000-0000-0000-0000-000000000004'),
  ('5262', 'Marketplaces',                                        '00000000-0000-0000-0000-000000000004'),
  ('5306', 'Discount Stores',                                     '00000000-0000-0000-0000-000000000004'),
  ('5310', 'Discount Stores',                                     '00000000-0000-0000-0000-000000000004'),
  ('5733', 'Music Stores, Musical Instruments',                   '00000000-0000-0000-0000-000000000010'),
  ('5735', 'Record Shops',                                        '00000000-0000-0000-0000-000000000007'),
  ('5946', 'Camera and Photographic Supply Stores',              '00000000-0000-0000-0000-000000000010'),
  ('5947', 'Card, Gift, Novelty and Souvenir Shops',            '00000000-0000-0000-0000-000000000010'),
  ('5949', 'Fabric, Needlework, Piece Goods and Sewing Stores',  '00000000-0000-0000-0000-000000000010'),
  ('5964', 'Direct Marketing - Catalog Merchants',               '00000000-0000-0000-0000-000000000004'),
  ('5965', 'Direct Marketing - Combination Catalog and Retail',  '00000000-0000-0000-0000-000000000004'),
  ('5966', 'Direct Marketing - Outbound Telemarketing',          '00000000-0000-0000-0000-000000000004'),
  ('5967', 'Direct Marketing - Inbound Telemarketing',           '00000000-0000-0000-0000-000000000004'),
  ('5968', 'Direct Marketing - Continuity / Subscription',       '00000000-0000-0000-0000-000000000004'),
  ('5969', 'Direct Marketing - Other',                           '00000000-0000-0000-0000-000000000004'),
  ('5970', 'Artist Supply Stores, Craft Shops',                  '00000000-0000-0000-0000-000000000010'),
  ('5992', 'Florists',                                            '00000000-0000-0000-0000-000000000010'),
  ('7278', 'Buying and Shopping Services / Clubs',                '00000000-0000-0000-0000-000000000004'),
  ('4112', 'Passenger Railways',                                   '00000000-0000-0000-0000-000000000008'),
  ('5962', 'Direct Marketing - Travel-Related Arrangement Services','00000000-0000-0000-0000-000000000006'),
  ('8398', 'Charitable and Social Service Organizations',          '00000000-0000-0000-0000-000000000010'),
  ('6513', 'Real Estate Agents and Managers - Rentals',            '00000000-0000-0000-0000-000000000010'),
  ('4784', 'Toll and Bridge Fees',                                 '00000000-0000-0000-0000-000000000008'),
  ('4829', 'Money Transfer',                                       '00000000-0000-0000-0000-000000000010'),
  ('6010', 'Financial Institutions - Manual Cash Disbursements',   '00000000-0000-0000-0000-000000000010'),
  ('5047', 'Medical, Dental, Ophthalmic and Hospital Equipment',   '00000000-0000-0000-0000-000000000015'),
  ('5199', 'Non-Durable Goods - Not Elsewhere Classified',         '00000000-0000-0000-0000-000000000010'),
  ('5960', 'Direct Marketing - Insurance Services',                '00000000-0000-0000-0000-000000000013'),
  ('5993', 'Cigar Stores and Stands',                              '00000000-0000-0000-0000-000000000010'),
  ('6011', 'Financial Institutions - Automated Cash Disbursements','00000000-0000-0000-0000-000000000010'),
  ('6012', 'Financial Institutions - Merchandise and Services',    '00000000-0000-0000-0000-000000000010'),
  ('6050', 'Quasi Cash - Financial Institutions',                  '00000000-0000-0000-0000-000000000010'),
  ('6051', 'Non-Financial Institutions - Foreign / Crypto Currency','00000000-0000-0000-0000-000000000010'),
  ('6211', 'Security Brokers / Dealers',                           '00000000-0000-0000-0000-000000000010'),
  ('6399', 'Insurance - Not Elsewhere Classified',                 '00000000-0000-0000-0000-000000000013'),
  ('6529', 'Quasi Cash - Remote Stored Value Load - Financial',    '00000000-0000-0000-0000-000000000010'),
  ('6530', 'Quasi Cash - Remote Stored Value Load - Merchant',     '00000000-0000-0000-0000-000000000010'),
  ('6534', 'Quasi Cash - Money Transfer',                          '00000000-0000-0000-0000-000000000010'),
  ('6540', 'Stored Value Card Purchase / Load',                    '00000000-0000-0000-0000-000000000010'),
  ('7523', 'Parking Lots and Garages',                             '00000000-0000-0000-0000-000000000008'),
  ('7349', 'Cleaning and Maintenance, Janitorial Services',        '00000000-0000-0000-0000-000000000010'),
  ('7511', 'Quasi Cash - Truck Stop Transactions',                 '00000000-0000-0000-0000-000000000010'),
  ('7995', 'Betting, Casinos and Lottery',                         '00000000-0000-0000-0000-000000000010'),
  ('8062', 'Hospitals',                                            '00000000-0000-0000-0000-000000000015'),
  ('8241', 'Correspondence Schools',                              '00000000-0000-0000-0000-000000000010'),
  ('8244', 'Business and Secretarial Schools',                     '00000000-0000-0000-0000-000000000010'),
  ('8249', 'Vocational and Trade Schools',                         '00000000-0000-0000-0000-000000000010'),
  ('8651', 'Political Organisations',                              '00000000-0000-0000-0000-000000000010'),
  ('8661', 'Religious Organisations',                              '00000000-0000-0000-0000-000000000010'),
  ('8699', 'Membership Organizations - Not Elsewhere Classified',  '00000000-0000-0000-0000-000000000010'),
  ('8999', 'Professional Services - Not Elsewhere Classified',     '00000000-0000-0000-0000-000000000010'),
  ('9211', 'Court Costs, Alimony and Child Support',               '00000000-0000-0000-0000-000000000010'),
  ('9223', 'Bail and Bond Payments',                              '00000000-0000-0000-0000-000000000010'),
  ('9405', 'Intra-Government Purchases',                           '00000000-0000-0000-0000-000000000010'),
  ('7841', 'Video Tape / DVD Rental Stores',                       '00000000-0000-0000-0000-000000000007'),
  ('7998', 'Aquariums, Dolphinariums, Zoos',                       '00000000-0000-0000-0000-000000000007'),
  ('4011', 'Railroads / Freight',                                  '00000000-0000-0000-0000-000000000008'),
  ('4214', 'Motor Freight Carriers and Trucking',                  '00000000-0000-0000-0000-000000000008'),
  ('4215', 'Courier Services',                                     '00000000-0000-0000-0000-000000000008'),
  ('5172', 'Petroleum and Petroleum Products',                     '00000000-0000-0000-0000-000000000003'),
  ('5552', 'Electric Vehicle Charging',                            '00000000-0000-0000-0000-000000000003'),
  ('5921', 'Package Stores - Beer, Wine, Liquor',                  '00000000-0000-0000-0000-000000000002'),
  ('7800', 'Government-Owned Lotteries',                           '00000000-0000-0000-0000-000000000010'),
  ('6532', 'Payment Service Provider - Member Payment',            '00000000-0000-0000-0000-000000000010'),
  ('6533', 'Payment Service Provider - Merchant Payment',          '00000000-0000-0000-0000-000000000010'),
  ('6536', 'MoneySend (Domestic)',                                 '00000000-0000-0000-0000-000000000010'),
  ('6537', 'MoneySend (International)',                             '00000000-0000-0000-0000-000000000010'),
  ('6538', 'MoneySend Funding',                                    '00000000-0000-0000-0000-000000000010'),
  ('6555', 'Mastercard Initiated Rebate',                          '00000000-0000-0000-0000-000000000010'),
  ('7299', 'Miscellaneous Personal Services',                      '00000000-0000-0000-0000-000000000010'),
  ('7801', 'Online Gambling',                                      '00000000-0000-0000-0000-000000000010')
ON CONFLICT (code) DO NOTHING;
