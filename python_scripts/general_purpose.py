# pylint: disable = C0111, C0103, C0411, C0301, W0102, C0330, C0303
"""General Purpose Functions"""
import numpy as np
from random import randint
from sklearn.covariance import EllipticEnvelope
from sklearn.ensemble import IsolationForest


def is_not_extreme_outlier(x, _min, _max):
    """Returns true if x >=min and x<=max."""
    return x >= _min and x <= _max


def my_reshape(sel, filter_by_digraph=''):
    """Reshapes the subject extracted data list.
       \nAttributes:
       \n sel: The list of dicts with digraphs timings: ['data']: [{'digraph', 'points'}]
       \n filter_by_digraph: Specifies the digraph to filter
       \n Returns: Object with keys ['subject'], ['track_code'], and ['points'] as x,y,z
    """
    if filter_by_digraph != '':
        tmp = [v for v in sel['data'] if v['digraph'] == filter_by_digraph]
        if tmp == []:
            # exit('!!!Exiting: No digraph data found for subject:' +
            #      sel['_subject'])
            return -1
        else:
            pts = tmp[0]['points']
    else:
        pts = sel['data'][0]['points']
        for v in sel['data'][1:]:
            pts = np.append(pts, v['points'], axis=0)
    return {"subject": sel['_subject'], "track_code": sel['_track_code'], "points": pts}


def is_inside_interval(point, m, t):
    """Returns: true if point is bigger than m-t and less than m+t"""
    return point >= m - t and point <= m + t


def clean_with_std(points, n_stds_tolerance):
    """Removes data that are too far away by n_stds of their mean
    \npoints: n x 3 numpy array of x,y,z points
    \nn_stds_tolerance: int How many stds tolerance
    \nReturns: n x 3 numpy array with clean data"""
    means = {"x": np.mean(points[:, 0]), "y": np.mean(
        points[:, 1]), "z": np.mean(points[:, 2])}
    tols = {"x": n_stds_tolerance * np.std(points[:, 0]), "y": n_stds_tolerance * np.std(
        points[:, 1]), "z": n_stds_tolerance * np.std(points[:, 2])}
    return np.array([row for row in points if is_inside_interval(row[0], means['x'], tols['x']) and is_inside_interval(row[1], means['y'], tols['y']) and is_inside_interval(row[2], means['z'], tols['z'])])


def clean_with_algo(X, algorithm, contamination=0.1):
    """Applies the specific algorithm to remove outliers from the data, something like outlier
       detection to remove noise from data coming from one class.
       \n X: NxM numpy array
       \n algorithm: Can be one of 'EllipticEnvelope'
       \n contamination: If EllipticEnvelope is used, the contamination
       specifies how polluted the data are
       \n Returns: Data without outliers, same shape as X
    """

    # Generate Model
    if hasattr(globals()[algorithm](), 'contamination'):
        model = globals()[algorithm](contamination=contamination)
    else:
        model = globals()[algorithm]()

    # Fit & predict
    model.fit(X)
    labels_pred = model.predict(X)

    # Remove outliers
    _X = np.array([row for i, row in enumerate(X) if labels_pred[i] != -1])


def events_sample(events, samples):
    """Samples a continuous amount of events defined by samples """
    if samples > len(events):
        exit('*events_sample: Exiting -> sample > events length')
    start = randint(0, len(events) - samples - 1)
    return events[start:start + samples]
