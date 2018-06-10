# pylint: disable = C0111, C0103, C0411, C0301, W0102, C0330, C0303
"""Train and test module"""
import numpy as np
import py_node_communication as pynocomm
import read_write as rw
from copy import deepcopy
import extract
# Machine Learning
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.svm import OneClassSVM
from sklearn.mixture import GaussianMixture
from scipy.spatial.distance import mahalanobis


def ret_digraph_points(sed, digraph):
    """Finds the digraph points of the subject extracted data.
    Parameters
    ----------
    `sed` (object) "_subject","_track_code", "data": [{"digraph","points"}]
    Returns
    ---------
    (list) The points of the particular digraph found
    """
    ret = [d['points'] for d in sed['data'] if d['digraph'] == digraph]
    if ret == []:
        pynocomm.send_to_node(
            '**Warning: No digraph points found in ret_digraph_points, digraph:' + digraph)
        _foo = 1
    else:
        ret = ret[0]
    return ret


def remove_missing_values(events):
    """Removes missing values from events. For example if a keyUp is missing or keyDown etc"""
    ret = deepcopy(events)
    srchd, key_events = [], []
    for evt in events:
        _tmp = [(j, e) for j, e in enumerate(events) if e['key']
                == evt['key'] and not e['key'] in srchd]
        if _tmp != []:
            key_events.append(_tmp)
        srchd.append(evt['key'])
    dels = []
    for di_evts in key_events:
        if di_evts[0][1]['event'] == 'keystrokeUp':
            dels.append(di_evts[0][0])
        if di_evts[len(di_evts) - 1][1]['event'] == 'keystrokeDown':
            dels.append(di_evts[len(di_evts) - 1][0])
    if dels != []:
        for i in sorted(dels, reverse=True):
            del ret[i]
    return ret


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

    return _X


def digraph_test_OneClassSVM(ref_points, test_points, algo_params={}):
    """Tests test_points against ref_points.
    Performs novelty detection with templates the ref_points and the test data the test_points
    Parameters
    ----------
    `ref_points` (numpy.array) Nx3 numpy array with points of referrer
    `test_points` (numpy.array) Nx3 numpy array with points of tester
    Returns
    ----------
    (int) The number of points from test_points that were considered as INLIERS from the algorithm
    """
    GAMMA = algo_params['gamma']
    # Fit ref
    model = OneClassSVM(nu=0.15, gamma=GAMMA).fit(ref_points)

    # Predict test
    pred_labels = model.predict(test_points)

    # Return count of predicted inliers
    return pred_labels[pred_labels == 1].size


def digraph_test_GMM(ref_points, test_points, algo_params={}):
    """Perform anomaly detection, with Gaussian Mixture Components according to my algorithm.
    Returns
    -------
    (list 1xM where M number of components) The weighted number of predicted inliers for each component
    """
    N_COMPONENTS = algo_params['n_components']
    DELTA = algo_params['delta']

    # Construct the cluster(s)
    gmm_model = GaussianMixture(n_components=N_COMPONENTS)
    gmm_model.fit(ref_points)
    weights = gmm_model.weights_
    means = gmm_model.means_
    covs = gmm_model.covariances_

    # Get the number of points for each cluster of trained data.
    train_labels = gmm_model.predict(ref_points)
    # stds = []
    # # Reshape covs and get stds
    # for c in gmm_model.covariances_:
    #     vec = np.sqrt(np.array([[c[i, i] for i in range(c.shape[0])]]))
    #     vec = np.array([[c[i, i] for i in range(c.shape[0])]])
    #     if stds == []:
    #         stds = vec
    #     else:
    #         stds = np.append(stds, vec, axis=0)

    # Compute score for each component
    score_comp = N_COMPONENTS * [0.]
    for m in range(N_COMPONENTS):

        # If a cluster has a limited number of points, ignore it
        if len([l for l in train_labels if l == m]) < 2:
            continue

        # Test each point
        _pass = 0.
        for test_point in test_points:

            # With malahnobis
            mlh = mahalanobis(test_point, means[m], np.linalg.inv(covs[m]))
            if mlh <= DELTA:
                _pass += 1

            # My first way:
            # flag = True
            # for dim, val in enumerate(test_point):
            #     if not (val >= means[m, dim] - DELTA * stds[m, dim] and val <= means[m, dim] + DELTA * stds[m, dim]):
            #         flag = False
            #         break
            # if flag is True:
            #     _pass += 1

        # Scale with the weight of component
        score_comp[m] += weights[m] * _pass

    # Return score
    return score_comp


def test(referrer, tester_events,   algorithm, training_params={},  apply_PCA=False,  clear_referrer_with_algo=False, clean_algo_parameters={"name": 'EllipticEnvelope', "contamination": 0.1, "visualize_results": False}):
    """Tests tester against referrer.

    The tester is the subject which claims to be the referrer. So
    he can either tell truth(genuine) or lie(impostor). This function
    will determine if the tester typing pattern looks a lot like
    the referrers' typing pattern.
    Parameters
    ----------
    `referrer` (object) {"_subject", "_track_code", "data": [{"digraph", "points"}]}
        It contains the extracted data timings for each digraph for the referrer\n
    `tester_events` (list) The list with the raw keystroke events of the tester.
    `apply_PCA` (boolean) Apply pca before test
    `clean_referrer_with_algo` (boolean) If you want to clean referrer data with outlier detection methods before testing
    `algo_clean_parameters` (object) "name", "contamination", "visualize_results"
    Returns
    ---------
    The percentage of digraph points that were considered INLIERS.
    """
    # Firstly fix tester events from missing values. (because the sampling is continuous but random)
    tester_events = remove_missing_values(tester_events)

    # Then extract timings of digraphs of tester events
    tester_timings = extract.one(
        {"_id": 1, "subject": '', "track_code": -1, "sessions": {"data": tester_events}}, logg=False)

    # pynocomm.send_to_node(str(tester_timings))

    # Test each digraph data of tester against referrer
    count_insufficient_ref_samples = 0.
    score = 0. if algorithm != 'GMM' else []
    count_global = 0.
    for test_digraph in tester_timings['data']:
        # pynocomm.send_to_node(str(test_digraph['points']))

        _tester_points = test_digraph['points'].astype(float)
        di_ref_points_ = ret_digraph_points(
            referrer, test_digraph['digraph'])

        # Find the digraph data of referrer
        if len(di_ref_points_) >= 10:
            di_ref_points = di_ref_points_.astype(float)

            # Transform ref and tester data with standard scaler
            sscaler = StandardScaler(with_mean=True, with_std=True).fit(
                np.append(di_ref_points, _tester_points, axis=0))
            train_points = sscaler.transform(di_ref_points)
            test_points = sscaler.transform(_tester_points)

            # Apply PCA if needed
            if apply_PCA is True:
                pca_model = PCA(n_components=2).fit(
                    np.append(di_ref_points, test_digraph['points'], axis=0))
                train_points = pca_model.transform(train_points)
                test_points = pca_model.transform(test_points)

            # Clean referrer points from noise if needed
            if clear_referrer_with_algo is True:
                train_points = clean_with_algo(
                    train_points, algorithm=clean_algo_parameters['name'], contamination=clean_algo_parameters['contamination'])

            # Anomaly-Test the digraph and get the count of inliers
            if algorithm == 'ONE_CLASS_SVM':
                score += digraph_test_OneClassSVM(train_points,
                                                  test_points, training_params)
            elif algorithm == 'GMM':
                # Special procedure for GMM
                _sc = digraph_test_GMM(
                    train_points, test_points, training_params)
                score.append(_sc)
        else:

            count_insufficient_ref_samples += len(test_digraph['points'])

        count_global += len(test_digraph['points'])

    # Find eventually the total score
    if count_global == count_insufficient_ref_samples:
        return -1
    else:
        if algorithm == 'ONE_CLASS_SVM':
            total_score = score / \
                (count_global - count_insufficient_ref_samples)
        elif algorithm == 'GMM':
            total_score = 0.
            for s in score:
                total_score += sum(s)
            total_score = total_score / \
                (count_global - count_insufficient_ref_samples)
            # pynocomm.send_to_node(str(total_score))
        if not isinstance(total_score, np.generic):
            return total_score
        else:
            return np.asscalar(total_score)


def main():
    """Gets the data from node, read from local the appropriate
    trained project and performs test"""

    NODE_DATA = pynocomm.receive_from_node()
    pynocomm.send_to_node('Python: Data received.')
    # pynocomm.send_to_node(NODE_DATA)
    tester = NODE_DATA['tester_data']
    testing_threshold = NODE_DATA['testing_threshold']
    training_algorithm = NODE_DATA['training_algorithm']
    training_params = NODE_DATA['training_params']

    # Load from local the appropriate refferer trained model
    referrer_timings = rw.read_timings_from_local(
        filename='./trained-projects/' + tester['track_code'] + '.json', specific_subject=tester['subject'])

    pynocomm.send_to_node('-Starting. Algorithm: ' +
                          training_algorithm + ', Params:' + str(training_params) + '\n')
    # Begin Train and Test Procedure...
    score = test(referrer_timings,
                 tester['events'],  training_algorithm, training_params)

    if score == -1:
        pynocomm.send_to_node({"not_enough_training": True})
    else:
        pynocomm.send_to_node(
            {"passed": score >= testing_threshold,
             "score": score,
             "not_enough_training": False
             })


if __name__ == '__main__':
    main()
