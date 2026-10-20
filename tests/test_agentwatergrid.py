import pytest
import json
from genlayer import *


def test_agentwatergrid_confirmed_aquifer_depletion_relief_payout(client):
    """Proves that a verified severe groundwater drawdown releases 100% indemnity to community."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    # Step 1: Enterprise locks 2 GEN water indemnity escrow
    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "CENTRAL-VALLEY-AQUIFER-B4", 150, 500, 6000],
        value=2000000000000000000  # 2 GEN
    )
    policy_id = str(tx_create.return_value)

    # Step 2: Community files alert with USGS groundwater feed
    usgs_url = "https://waterdata.usgs.gov/nwis/uv?site_no=361201119500201&format=rdb"
    contract.connect(community_rep).trigger_depletion_claim(
        args=[policy_id, usgs_url]
    )

    # Step 3: Mock AI Hydrology Tribunal -> Drawdown 185 cm (> 150 cm threshold)
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WATER_GRID_V1",
                    "verdict": "AQUIFER_DEPLETION_CONFIRMED",
                    "confidence": 98,
                    "measured_drawdown_cm": 185,
                    "measured_salinity_ppm": 420,
                    "reason": "Severe piezometric head drawdown detected. Critical threshold breached."
                })
            },
            "web_mocks": {
                usgs_url: {"status": 200, "body": "USGS_WELL_361201119500201 DRAWDOWN:185cm SALINITY:420ppm"}
            }
        }
    )

    contract.connect(community_rep).adjudicate_water_drawdown(args=[policy_id])

    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert p_data["verdict"] == "AQUIFER_DEPLETION_CONFIRMED"
    assert p_data["measured_drawdown_cm"] == 185


def test_agentwatergrid_unaccredited_source_rejected(client):
    """Proves that trigger alerts from unaccredited sources are rejected."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "WELL-BASIN-01", 100, 400, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    # Fake blog source must be reverted
    with pytest.raises(Exception) as exc_info:
        contract.connect(community_rep).trigger_depletion_claim(
            args=[policy_id, "https://my-unverified-water-blog.com/telemetry.json"]
        )
    assert "Telemetry unauthenticated" in str(exc_info.value)


def test_agentwatergrid_partial_drawdown_penalty(client):
    """Proves moderate drawdown triggers 40% relief payout to community and 60% refund preservation."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "SAN-JOAQUIN-BASIN-09", 200, 600, 6000],
        value=1000000000000000000  # 1 GEN
    )
    policy_id = str(tx_create.return_value)

    copernicus_url = "https://land.copernicus.eu/telemetry/aquifer-09.json"
    contract.connect(community_rep).trigger_depletion_claim(args=[policy_id, copernicus_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WATER_GRID_V1",
                    "verdict": "PARTIAL_DRAWDOWN_PENALTY",
                    "confidence": 92,
                    "measured_drawdown_cm": 130,
                    "measured_salinity_ppm": 350,
                    "reason": "Moderate water table drawdown within warning band (100-199 cm)."
                })
            },
            "web_mocks": {
                copernicus_url: {"status": 200, "body": "COPERNICUS_AQUIFER_09 DRAWDOWN:130cm SALINITY:350ppm"}
            }
        }
    )

    contract.connect(enterprise).adjudicate_water_drawdown(args=[policy_id])
    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["verdict"] == "PARTIAL_DRAWDOWN_PENALTY"

    # Advance time beyond 72s cooling window
    if hasattr(contract, "set_time"):
        contract.set_time(1760000000 + 100)

    contract.connect(enterprise).finalize_settlement(args=[policy_id])
    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 4  # STATUS_SETTLED_PARTIAL


def test_agentwatergrid_compliant_water_table(client):
    """Proves sustainable extraction results in full escrow refund to enterprise."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "COLORADO-BASIN-SEC1", 160, 450, 6000],
        value=1500000000000000000
    )
    policy_id = str(tx_create.return_value)
    noaa_url = "https://water.noaa.gov/sensors/colorado-sec1.json"
    contract.connect(community_rep).trigger_depletion_claim(args=[policy_id, noaa_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WATER_GRID_V1",
                    "verdict": "AQUIFER_COMPLIANT_CLEAN",
                    "confidence": 96,
                    "measured_drawdown_cm": 45,
                    "measured_salinity_ppm": 210,
                    "reason": "Normal seasonal fluctuation well below threshold."
                })
            },
            "web_mocks": {
                noaa_url: {"status": 200, "body": "NOAA_COLORADO_SEC1 DRAWDOWN:45cm SALINITY:210ppm"}
            }
        }
    )

    contract.connect(community_rep).adjudicate_water_drawdown(args=[policy_id])
    if hasattr(contract, "set_time"):
        contract.set_time(1760000000 + 80)
    contract.connect(enterprise).finalize_settlement(args=[policy_id])

    p_settled = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_settled["status"] == 5  # STATUS_SETTLED_COMPLIANT
    assert p_settled["verdict"] == "AQUIFER_COMPLIANT_CLEAN"


def test_agentwatergrid_cooling_off_protection(client):
    """Verifies that early settlement finalization before 72s cooling window reverts."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "OGALLALA-AQUIFER-N2", 120, 500, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)
    usgs_url = "https://waterdata.usgs.gov/well-ogallala.json"
    contract.connect(community_rep).trigger_depletion_claim(args=[policy_id, usgs_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WATER_GRID_V1",
                    "verdict": "AQUIFER_DEPLETION_CONFIRMED",
                    "confidence": 95,
                    "measured_drawdown_cm": 160,
                    "measured_salinity_ppm": 480,
                    "reason": "Drawdown exceeds 120cm limit."
                })
            },
            "web_mocks": {
                usgs_url: {"status": 200, "body": "OGALLALA_WELL DRAWDOWN:160cm SALINITY:480ppm"}
            }
        }
    )

    contract.connect(community_rep).adjudicate_water_drawdown(args=[policy_id])

    # Attempt to settle immediately without advancing cooling window
    with pytest.raises(Exception) as exc:
        contract.connect(community_rep).finalize_settlement(args=[policy_id])
    assert "Cooling-off challenge window" in str(exc.value)


def test_agentwatergrid_appeal_overturn_to_compliant(client):
    """Verifies that an enterprise appeal with 10% bond and supplemental telemetry overturns a false breach."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "VALLEY-DISTRICT-8", 100, 500, 6000],
        value=1000000000000000000  # 1 GEN
    )
    policy_id = str(tx_create.return_value)
    primary_url = "https://waterdata.usgs.gov/valley-dist-8.json"
    contract.connect(community_rep).trigger_depletion_claim(args=[policy_id, primary_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                primary_url: json.dumps({
                    "canary": "CANARY_AGENT_WATER_GRID_V1",
                    "verdict": "AQUIFER_DEPLETION_CONFIRMED",
                    "confidence": 88,
                    "measured_drawdown_cm": 115,
                    "measured_salinity_ppm": 300,
                    "reason": "Primary well head drawdown exceeded 100cm."
                })
            },
            "web_mocks": {
                primary_url: {"status": 200, "body": "PRIMARY_WELL DRAWDOWN:115cm SALINITY:300ppm"}
            }
        }
    )
    contract.connect(enterprise).adjudicate_water_drawdown(args=[policy_id])

    # Enterprise stakes 10% dispute bond (0.1 GEN) with deep piezometer telemetry
    supp_url = "https://environment.data.gov.uk/hydrology/piezometer-8b.json"
    contract.connect(enterprise).appeal_verdict(
        args=[policy_id, "Sensor anomaly at primary head; regional basin piezometer shows safe baseline.", supp_url],
        value=100000000000000000  # 0.1 GEN
    )

    p_disp = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_disp["status"] == 6  # STATUS_DISPUTED

    # Supreme Appellate adjudication upholds compliance
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WATER_GRID_V1",
                    "verdict": "APPEAL_UPHELD_COMPLIANT",
                    "reason": "Regional piezometer telemetry proves drawdown was localized transient pump testing; basin is intact."
                })
            },
            "web_mocks": {
                supp_url: {"status": 200, "body": "REGIONAL_PIEZOMETER BASELINE_STABLE DRAWDOWN:32cm"}
            }
        }
    )
    contract.connect(enterprise).adjudicate_appeal(args=[policy_id])

    p_resolved = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_resolved["status"] == 5  # STATUS_SETTLED_COMPLIANT
    assert p_resolved["verdict"] == "AQUIFER_COMPLIANT_CLEAN"


def test_agentwatergrid_appeal_dismissed_bond_forfeit(client):
    """Verifies that a dismissed appeal forfeits the 10% bond to the counterparty."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "PERTH-GROUNDWATER-3", 100, 500, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)
    usgs_url = "https://waterdata.usgs.gov/perth-3.json"
    contract.connect(community_rep).trigger_depletion_claim(args=[policy_id, usgs_url])

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WATER_GRID_V1",
                    "verdict": "AQUIFER_DEPLETION_CONFIRMED",
                    "confidence": 97,
                    "measured_drawdown_cm": 175,
                    "measured_salinity_ppm": 600,
                    "reason": "Depletion confirmed with saline intrusion."
                })
            },
            "web_mocks": {
                usgs_url: {"status": 200, "body": "PERTH_3 DRAWDOWN:175cm SALINITY:600ppm"}
            }
        }
    )
    contract.connect(community_rep).adjudicate_water_drawdown(args=[policy_id])

    supp_url = "https://grdc.bafg.de/telemetry/station-perth3.json"
    contract.connect(enterprise).appeal_verdict(
        args=[policy_id, "Contesting calibration of salinity sensor.", supp_url],
        value=100000000000000000
    )

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_WATER_GRID_V1",
                    "verdict": "APPEAL_DISMISSED",
                    "reason": "Supplemental telemetry corroborates irreversible saline intrusion."
                })
            },
            "web_mocks": {
                supp_url: {"status": 200, "body": "GRDC_PERTH3 DRAWDOWN:180cm SALINITY:620ppm"}
            }
        }
    )
    contract.connect(community_rep).adjudicate_appeal(args=[policy_id])

    p_final = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_final["status"] == 3  # STATUS_SETTLED_RELIEF_PAID
    assert p_final["verdict"] == "AQUIFER_DEPLETION_CONFIRMED"


def test_agentwatergrid_sensor_fetch_failure_unresolved_state(client):
    """Verifies that an unreachable sensor endpoint yields STATUS_UNRESOLVED and preserves escrow."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "MURRAY-DARLING-B2", 150, 450, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)
    unreachable_url = "https://bafg.de/down-telemetry-feed.json"
    contract.connect(community_rep).trigger_depletion_claim(args=[policy_id, unreachable_url])

    # No web_mock configured -> simulate 404 / network timeout
    client.provider.make_request(
        method="sim_installMocks",
        params={"llm_mocks": {}, "web_mocks": {}}
    )

    contract.connect(community_rep).adjudicate_water_drawdown(args=[policy_id])
    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 8  # STATUS_UNRESOLVED
    assert "UNRESOLVED_FETCH_FAILED" in p_data["verdict"]

    # Must prevent settlement while unresolved
    with pytest.raises(Exception) as exc:
        contract.connect(community_rep).finalize_settlement(args=[policy_id])
    assert "unresolved error state" in str(exc.value)


def test_agentwatergrid_canary_token_defense(client):
    """Verifies prompt injection defense via security canary token."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "JORDAN-VALLEY-AQUIFER", 100, 500, 6000],
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)
    usgs_url = "https://waterdata.usgs.gov/jordan-valley.json"
    contract.connect(community_rep).trigger_depletion_claim(args=[policy_id, usgs_url])

    # Injecting invalid canary token
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "HACKED_OR_CORRUPT_CANARY",
                    "verdict": "AQUIFER_DEPLETION_CONFIRMED",
                    "confidence": 99,
                    "measured_drawdown_cm": 250,
                    "measured_salinity_ppm": 800,
                    "reason": "Adversarial prompt injection attempt."
                })
            },
            "web_mocks": {
                usgs_url: {"status": 200, "body": "USGS_JORDAN_VALLEY DRAWDOWN:250cm"}
            }
        }
    )

    contract.connect(community_rep).adjudicate_water_drawdown(args=[policy_id])
    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 8  # STATUS_UNRESOLVED
    assert "UNRESOLVED_CANARY_FAILED" in p_data["verdict"]


def test_agentwatergrid_reclaim_expired_policy(client):
    """Verifies enterprise can safely reclaim escrow after policy duration expires without breaches."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "GREAT-ARTESIAN-B6", 140, 500, 100],  # 100 blocks = 300s
        value=1000000000000000000
    )
    policy_id = str(tx_create.return_value)

    # Attempt to reclaim prematurely
    with pytest.raises(Exception) as exc:
        contract.connect(enterprise).cancel_or_reclaim(args=[policy_id])
    assert "Policy is still active" in str(exc.value)

    # Advance time past expiration
    if hasattr(contract, "set_time"):
        contract.set_time(1760000000 + 400)

    contract.connect(enterprise).cancel_or_reclaim(args=[policy_id])
    p_data = json.loads(contract.get_policy(args=[policy_id]).call())
    assert p_data["status"] == 7  # STATUS_EXPIRED_RECLAIMED
    assert p_data["verdict"] == "EXPIRED_CLEAN"


def test_agentwatergrid_pull_payment_claim(client):
    """Verifies pull-payment claimable balance withdrawal."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx_create = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "ARAL-BASIN-RECOVERY", 100, 400, 100],
        value=500000000000000000
    )
    policy_id = str(tx_create.return_value)

    if hasattr(contract, "set_time"):
        contract.set_time(1760000000 + 400)
    contract.connect(enterprise).cancel_or_reclaim(args=[policy_id])

    bal = contract.get_claimable_balance(args=[str(enterprise)]).call()
    assert int(bal) > 0

    contract.connect(enterprise).claim_payout()
    bal_after = contract.get_claimable_balance(args=[str(enterprise)]).call()
    assert int(bal_after) == 0


def test_agentwatergrid_views_and_stats(client):
    """Verifies stats and list query view methods."""
    contract = client.deploy("contracts/contract.py")
    enterprise = client.accounts[0]
    community_rep = client.accounts[1]

    tx1 = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "AQUIFER-ALPHA-1", 100, 300, 1000],
        value=1000000000000000000
    )
    tx2 = contract.connect(enterprise).create_water_license_escrow(
        args=[str(community_rep), "AQUIFER-BETA-2", 200, 600, 1000],
        value=2000000000000000000
    )

    count = int(contract.get_policy_count().call())
    assert count == 2

    all_p = json.loads(contract.get_all_policies().call())
    assert len(all_p) == 2
    assert all_p[0]["aquifer_basin_id"] == "AQUIFER-ALPHA-1"
    assert all_p[1]["aquifer_basin_id"] == "AQUIFER-BETA-2"

    stats = json.loads(contract.get_stats().call())
    assert stats["total_policies"] == 2
    assert stats["total_water_locked"] == "3000000000000000000"
