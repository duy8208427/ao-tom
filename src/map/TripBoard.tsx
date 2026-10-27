import { formatClock, formatNumber, formatRemaining, sortTrips, tripStatusLabel } from "../geo";
import type { VehicleView } from "../types";

type Props = {
  vehicles: VehicleView[];
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
  onClose: () => void;
  compact?: boolean;
};

export function TripBoard({ vehicles, selectedVehicleId, onSelect, onClose, compact }: Props) {
  const rows = sortTrips(vehicles);

  return (
    <section className={`trip-board${compact ? " compact" : ""}`}>
      {compact ? null : (
        <header>
          <b>Chuyến xe</b>
          <span>{rows.length} chuyến</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng bảng chuyến">
            ×
          </button>
        </header>
      )}
      <div className="trip-table-wrap scroll-fade">
        <table className="trip-table">
          <thead>
            <tr>
              <th>Xe / tài xế</th>
              <th>Ao → nhà máy</th>
              {compact ? null : <th>Kg</th>}
              <th>Thùng</th>
              <th>Xuất</th>
              <th>ETA</th>
              <th>Còn lại</th>
              <th>TT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((vehicle) => {
              const trip = vehicle.trip;
              if (!trip) return null;
              const hot = trip.bin_temp >= 12;
              return (
                <tr key={vehicle.id}>
                  <td>
                    <button
                      type="button"
                      className={`trip-link${selectedVehicleId === vehicle.id ? " on" : ""}`}
                      onClick={() => onSelect(vehicle.id)}
                    >
                      <b>{vehicle.plate}</b>
                      <small>{vehicle.driver}</small>
                    </button>
                  </td>
                  <td>
                    {vehicle.pond_name ?? trip.pond_id} → {vehicle.plant_name ?? trip.plant_id}
                  </td>
                  {compact ? null : <td>{formatNumber(trip.weight_kg, 0)}</td>}
                  <td className={hot ? "hot" : ""}>{trip.bin_temp.toFixed(1)}°C</td>
                  <td>{formatClock(trip.departed_at)}</td>
                  <td>{formatClock(trip.eta)}</td>
                  <td>{formatRemaining(vehicle.remaining_min)}</td>
                  <td>
                    <em className={`trip-status ${trip.status}`}>{tripStatusLabel(trip.status)}</em>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
